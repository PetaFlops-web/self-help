import pool from '../../config/database.js';
import { HttpError } from '../../helpers/http.js';
import { validateProjectRow } from './validator.js';
import { parseSiRUPCsv } from './sirup-parser.js';
import { insertEtlError, updateSumberData } from '../../repositories/etl.js';
import redisClient from '../../config/redis.js';
import { invalidateCache } from '../../middlewares/cache.js';
const SUPPORTED_SOURCES = new Set(['SRC-01']);
export async function runEtl(sourceId, csvContent) {
    if (!SUPPORTED_SOURCES.has(sourceId)) {
        throw new HttpError(400, 'source_id tidak didukung');
    }
    const rawRows = parseSiRUPCsv(csvContent);
    const totalRows = rawRows.length;
    const wilayahRes = await pool.query('SELECT kode_bps FROM wilayah');
    const validKodeBps = new Set(wilayahRes.rows.map((r) => r.kode_bps));
    let accepted = 0;
    let rejected = 0;
    for (const row of rawRows) {
        const result = validateProjectRow(row, validKodeBps);
        if (!result.ok) {
            rejected += 1;
            await insertEtlError(sourceId, row, result.reason);
            continue;
        }
        const v = result.data;
        await pool.query(`INSERT INTO proyek (kode_rup, nama, dinas, kode_bps, tahun_anggaran, pagu, hps, sumber_dana, metode_pemilihan, pengumuman_rup_tgl, source_id, source_url, fetched_at, match_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), 'unmatched')
       ON CONFLICT (kode_rup) DO UPDATE SET
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
         fetched_at = EXCLUDED.fetched_at`, [
            v.kode_rup,
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
            null,
        ]);
        accepted += 1;
    }
    await updateSumberData(sourceId, totalRows);
    const status = accepted === 0 ? 'failed' : rejected > 0 ? 'partial' : 'success';
    try {
        if (redisClient.isReady) {
            await invalidateCache('projects', 'meta', 'stats', 'reports');
            await redisClient.quit();
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
    };
}
