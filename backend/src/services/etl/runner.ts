import pool from '../../config/database.js';
import { HttpError } from '../../helpers/http.js';
import { validateProjectRow } from './validator.js';
import { insertEtlError, updateSumberData, getSumberDataById } from '../../repositories/etl.js';
import { autoMatchProject } from '../matching.js';
import redisClient, { connectRedis } from '../../config/redis.js';
import { invalidateCache } from '../../middlewares/cache.js';
import { createSirupConnector } from './connectors/sirup.js';
import { mapRawRecords, parseRawCsv, parseRawJson, type ParsedRawDataset } from './records.js';
import { SIRUP_FIELD_MAP } from './sirup-parser.js';
import { JSON_PROJECT_FIELD_MAP } from './json-parser.js';
import {
  detectExtraImportMode,
  importDepartmentBudgets,
  importTenderParticipants,
  type ExtraImportSummary,
} from './extra-sources.js';
import type { EtlRunResult, EtlParsedRow } from '../../types/etl.js';
import type { MatchProjectIdentity } from '../../types/matching.js';

const SUPPORTED_SOURCES = new Set(['SRC-01']);
const ETL_LOCK_KEY = 987654321;

function normalizeSourceUrl(sourceUrl: string): string {
  const value = sourceUrl.trim();
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new HttpError(400, 'source_url harus URL HTTP atau HTTPS valid');
  }
  return value;
}

async function importProjectRows(
  sourceId: string,
  parsedRows: EtlParsedRow[],
  provenanceUrl: string,
  validKodeBps: Set<string>,
): Promise<ExtraImportSummary> {
  let accepted = 0;
  let rejected = 0;
  const errors: { baris: number; alasan: string }[] = [];
  const seenKodeRup = new Set<string>();

  for (const { normalized, raw, lineNumber } of parsedRows) {
    const kodeRup = (normalized.kode_rup ?? '').trim();
    if (kodeRup && seenKodeRup.has(kodeRup)) {
      rejected += 1;
      errors.push({ baris: lineNumber, alasan: 'kode_rup duplikat dalam file' });
      await insertEtlError(sourceId, raw, 'kode_rup duplikat dalam file');
      continue;
    }
    if (kodeRup) seenKodeRup.add(kodeRup);

    const result = validateProjectRow(normalized, validKodeBps);
    if (!result.ok) {
      rejected += 1;
      errors.push({ baris: lineNumber, alasan: result.reason });
      await insertEtlError(sourceId, raw, result.reason);
      continue;
    }

    const v = result.data;

    if (v.kode_rup) {
      const conflict = await pool.query<{ asal_data: string }>(
        'SELECT asal_data FROM proyek WHERE kode_rup = $1',
        [v.kode_rup],
      );
      if (conflict.rows[0]?.asal_data === 'manual_admin') {
        rejected += 1;
        errors.push({ baris: lineNumber, alasan: 'bentrok_entri_manual' });
        await insertEtlError(sourceId, raw, 'bentrok_entri_manual');
        continue;
      }
    }

    const upsert = await pool.query<MatchProjectIdentity>(
      `INSERT INTO proyek (kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran, pagu, hps, sumber_dana, metode_pemilihan, pengumuman_rup_tgl, source_id, source_url, fetched_at, match_status, asal_data)
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
       RETURNING id, kode_tender, source_id, match_status`,
      [
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
      ],
    );
    accepted += 1;
    const project = upsert.rows[0];
    if (project) await autoMatchProject(project);
  }

  return { totalRows: parsedRows.length, accepted, rejected, errors };
}

async function resolveManualImportSource(
  sourceId: string,
  sourceUrl?: string,
): Promise<string> {
  const sumber = await getSumberDataById(sourceId);
  if (!sumber) {
    throw new HttpError(400, 'source_id tidak ditemukan di sumber_data');
  }
  return sourceUrl ? normalizeSourceUrl(sourceUrl) : (sumber.url ?? '');
}

export async function runEtl(
  sourceId: string,
  csvContent?: string,
  sourceUrl?: string,
  jsonContent?: string,
): Promise<EtlRunResult> {
  const lockClient = await pool.connect();
  let locked = false;
  try {
    const lockRes = await lockClient.query<{ ok: boolean }>(
      'SELECT pg_try_advisory_lock($1::bigint) AS ok',
      [ETL_LOCK_KEY],
    );
    if (!lockRes.rows[0]?.ok) {
      throw new HttpError(409, 'ETL sedang berjalan untuk sumber ini');
    }
    locked = true;

    let provenanceUrl: string;
    let parsedRows: EtlParsedRow[] = [];
    let rawDataset: ParsedRawDataset | null = null;
    let projectFieldMap: Record<string, string> = SIRUP_FIELD_MAP;
    let projectPassthrough: string[] = ['nama'];

    if (csvContent !== undefined && csvContent !== '') {
      provenanceUrl = await resolveManualImportSource(sourceId, sourceUrl);
      rawDataset = parseRawCsv(csvContent);
    } else if (jsonContent !== undefined && jsonContent !== '') {
      provenanceUrl = await resolveManualImportSource(sourceId, sourceUrl);
      try {
        rawDataset = parseRawJson(jsonContent, 'JSON harus berupa array objek');
      } catch (err) {
        throw new HttpError(400, err instanceof Error ? err.message : 'Format JSON tidak valid');
      }
      projectFieldMap = JSON_PROJECT_FIELD_MAP;
      projectPassthrough = [];
    } else {
      if (!SUPPORTED_SOURCES.has(sourceId)) {
        throw new HttpError(400, 'source_id tidak didukung untuk pengambilan otomatis');
      }
      const sumber = await getSumberDataById(sourceId);
      if (!sumber) {
        throw new HttpError(400, 'source_id tidak ditemukan');
      }
      if (!sumber.boleh_otomatis) {
        throw new HttpError(
          403,
          `Sumber ${sourceId} tidak mengizinkan pengambilan otomatis. Gunakan impor manual.`,
        );
      }
      if (!sumber.url) {
        throw new HttpError(400, 'URL sumber data tidak tersedia');
      }
      provenanceUrl = normalizeSourceUrl(sumber.url);
      parsedRows = (await createSirupConnector({ apiUrl: sumber.url }).fetchRows()).rows;
    }

    const wilayahRes = await pool.query<{ kode_bps: string }>('SELECT kode_bps FROM wilayah');
    const validKodeBps = new Set(wilayahRes.rows.map((r) => r.kode_bps));

    let summary: ExtraImportSummary;
    if (rawDataset !== null) {
      const mode = detectExtraImportMode(sourceId, rawDataset);
      if (mode === 'anggaran_dinas') {
        summary = await importDepartmentBudgets(sourceId, rawDataset, provenanceUrl, validKodeBps);
      } else if (mode === 'peserta_tender') {
        summary = await importTenderParticipants(sourceId, rawDataset, provenanceUrl);
      } else {
        const mapped = mapRawRecords(rawDataset.records, projectFieldMap, projectPassthrough);
        summary = await importProjectRows(sourceId, mapped, provenanceUrl, validKodeBps);
      }
    } else {
      summary = await importProjectRows(sourceId, parsedRows, provenanceUrl, validKodeBps);
    }

    await updateSumberData(sourceId, summary.accepted);

    const status: EtlRunResult['status'] =
      summary.accepted === 0 ? 'failed' : summary.rejected > 0 ? 'partial' : 'success';

    try {
      if (!redisClient.isOpen) await connectRedis();
      if (redisClient.isReady) {
        await invalidateCache('projects', 'meta', 'stats', 'reports');
      } else {
        console.warn('Redis belum siap, lewati invalidasi cache');
      }
    } catch (err) {
      console.warn('Gagal invalidasi cache ETL:', err);
    }

    return {
      source_id: sourceId,
      status,
      total_rows: summary.totalRows,
      accepted: summary.accepted,
      rejected: summary.rejected,
      errors: summary.errors,
    };
  } finally {
    if (locked) {
      try {
        await lockClient.query('SELECT pg_advisory_unlock($1::bigint)', [ETL_LOCK_KEY]);
      } catch (err) {
        console.warn('Gagal melepaskan advisory lock ETL:', err);
      }
    }
    lockClient.release();
  }
}
