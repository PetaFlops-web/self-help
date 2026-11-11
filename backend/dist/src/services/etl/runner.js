import pool from '../../config/database.js';
import { HttpError } from '../../helpers/http.js';
import { validateProjectRow } from './validator.js';
import { insertEtlError, updateSumberData, getSumberDataById } from '../../repositories/etl.js';
import { autoMatchProject } from '../matching.js';
import { connectRedis } from '../../config/redis.js';
import redisClient from '../../config/redis.js';
import { invalidateCache } from '../../middlewares/cache.js';
import { createSirupConnector } from './connectors/sirup.js';
const SUPPORTED_SOURCES = new Set(['SRC-01']);
const ETL_LOCK_KEY = 987654321;
function normalizeSourceUrl(sourceUrl) {
    const value = sourceUrl.trim();
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            throw new Error('unsupported protocol');
        }
    }
    catch {
        throw new HttpError(400, 'source_url harus URL HTTP atau HTTPS valid');
    }
    return value;
}
export async function runEtl(sourceId, csvContent, sourceUrl, jsonContent) {
    const lockClient = await pool.connect();
    let locked = false;
    try {
        const lockRes = await lockClient.query('SELECT pg_try_advisory_lock($1::bigint) AS ok', [ETL_LOCK_KEY]);
        if (!lockRes.rows[0]?.ok) {
            throw new HttpError(409, 'ETL sedang berjalan untuk sumber ini');
        }
        locked = true;
        let provenanceUrl;
        let parsedRows;
        if (csvContent !== undefined && csvContent !== '') {
            const sumber = await getSumberDataById(sourceId);
            if (!sumber) {
                throw new HttpError(400, 'source_id tidak ditemukan di sumber_data');
            }
            provenanceUrl = sourceUrl ? normalizeSourceUrl(sourceUrl) : (sumber.url ?? '');
            parsedRows = (await createSirupConnector({ csvContent }).fetchRows()).rows;
        }
        else if (jsonContent !== undefined && jsonContent !== '') {
            const sumber = await getSumberDataById(sourceId);
            if (!sumber) {
                throw new HttpError(400, 'source_id tidak ditemukan di sumber_data');
            }
            provenanceUrl = sourceUrl ? normalizeSourceUrl(sourceUrl) : (sumber.url ?? '');
            const { parseJsonImport } = await import('./json-parser.js');
            parsedRows = parseJsonImport(jsonContent);
        }
        else {
            if (!SUPPORTED_SOURCES.has(sourceId)) {
                throw new HttpError(400, 'source_id tidak didukung untuk pengambilan otomatis');
            }
            const sumber = await getSumberDataById(sourceId);
            if (!sumber) {
                throw new HttpError(400, 'source_id tidak ditemukan');
            }
            if (!sumber.boleh_otomatis) {
                throw new HttpError(403, `Sumber ${sourceId} tidak mengizinkan pengambilan otomatis. Gunakan impor manual.`);
            }
            if (!sumber.url) {
                throw new HttpError(400, 'URL sumber data tidak tersedia');
            }
            provenanceUrl = normalizeSourceUrl(sumber.url);
            parsedRows = (await createSirupConnector({ apiUrl: sumber.url }).fetchRows()).rows;
        }
        const totalRows = parsedRows.length;
        const wilayahRes = await pool.query('SELECT kode_bps FROM wilayah');
        const validKodeBps = new Set(wilayahRes.rows.map((r) => r.kode_bps));
        let accepted = 0;
        let rejected = 0;
        const errors = [];
        const seenKodeRup = new Set();
        for (const { normalized, raw, lineNumber } of parsedRows) {
            const kodeRup = (normalized.kode_rup ?? '').trim();
            if (kodeRup && seenKodeRup.has(kodeRup)) {
                rejected += 1;
                errors.push({ baris: lineNumber, alasan: 'kode_rup duplikat dalam file' });
                await insertEtlError(sourceId, raw, 'kode_rup duplikat dalam file');
                continue;
            }
            if (kodeRup)
                seenKodeRup.add(kodeRup);
            const result = validateProjectRow(normalized, validKodeBps);
            if (!result.ok) {
                rejected += 1;
                errors.push({ baris: lineNumber, alasan: result.reason });
                await insertEtlError(sourceId, raw, result.reason);
                continue;
            }
            const v = result.data;
            if (v.kode_rup) {
                const conflict = await pool.query('SELECT asal_data FROM proyek WHERE kode_rup = $1', [v.kode_rup]);
                if (conflict.rows[0]?.asal_data === 'manual_admin') {
                    rejected += 1;
                    errors.push({ baris: lineNumber, alasan: 'bentrok_entri_manual' });
                    await insertEtlError(sourceId, raw, 'bentrok_entri_manual');
                    continue;
                }
            }
            const upsert = await pool.query(`INSERT INTO proyek (kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran, pagu, hps, sumber_dana, metode_pemilihan, pengumuman_rup_tgl, source_id, source_url, fetched_at, match_status, asal_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), 'unmatched', 'pemerintah')
         ON CONFLICT (kode_rup) DO UPDATE SET
           kode_tender = EXCLUDED.kode_tender,
           nama = EXCLUDED.nama,
           dinas = EXCLUDED.dinas,
           kode_bps = EXCLUDED.kode_bps,
           tahun_anggaran = EXCLUDED.tahun_anggaran,
           pagu = EXCLUDED.pagu,
           hps = EXCLUDED.hps,
           sumber_dana = EXCLUDED.sumber_dana,
           metode_pemilihan = EXCLUDED.metode_pemilihan,
           pengumuman_rup_tgl = EXCLUDED.pengumuman_rup_tgl,
           source_id = EXCLUDED.source_id,
           source_url = EXCLUDED.source_url,
           fetched_at = EXCLUDED.fetched_at,
           asal_data = 'pemerintah'
         RETURNING id, kode_tender, source_id, match_status`, [
                v.kode_rup,
                v.kode_tender,
                v.nama,
                v.dinas,
                v.kode_bps,
                v.tahun_anggaran,
                v.pagu,
                v.hps,
                v.sumber_dana,
                v.metode_pemilihan,
                v.pengumuman_rup_tgl,
                sourceId,
                provenanceUrl,
            ]);
            accepted += 1;
            const project = upsert.rows[0];
            if (project)
                await autoMatchProject(project);
        }
        await updateSumberData(sourceId, accepted);
        const status = accepted === 0 ? 'failed' : rejected > 0 ? 'partial' : 'success';
        try {
            if (!redisClient.isOpen)
                await connectRedis();
            if (redisClient.isReady) {
                await invalidateCache('projects', 'meta', 'stats', 'reports');
            }
            else {
                console.warn('Redis belum siap, lewati invalidasi cache');
            }
        }
        catch (err) {
            console.warn('Gagal invalidasi cache ETL:', err);
        }
        return {
            source_id: sourceId,
            status,
            total_rows: totalRows,
            accepted,
            rejected,
            errors,
        };
    }
    finally {
        if (locked) {
            try {
                await lockClient.query('SELECT pg_advisory_unlock($1::bigint)', [ETL_LOCK_KEY]);
            }
            catch (err) {
                console.warn('Gagal melepaskan advisory lock ETL:', err);
            }
        }
        lockClient.release();
    }
}
