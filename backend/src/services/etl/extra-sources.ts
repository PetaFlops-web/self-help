import { createHash } from 'node:crypto';
import pool from '../../config/database.js';
import { insertEtlError } from '../../repositories/etl.js';
import { recalculateProjectScore } from '../project-scoring.js';
import type { EtlRawRow } from '../../types/etl.js';
import { mapRawRecords, type ParsedRawDataset } from './records.js';
import { parseBoundedYear, parseNonNegativeBigInt } from './validator.js';

export type ExtraImportMode = 'anggaran_dinas' | 'peserta_tender' | 'proyek';

export interface ExtraImportSummary {
  totalRows: number;
  accepted: number;
  rejected: number;
  errors: { baris: number; alasan: string }[];
}

const PII_KEYS = new Set([
  'nik',
  'alamat',
  'telepon',
  'no_hp',
  'hp',
  'email',
  'npwp',
  'kontak',
]);

const BUDGET_FIELD_MAP: Record<string, string> = {
  dinas: 'dinas',
  satker: 'dinas',
  kode_bps: 'kode_bps',
  tahun: 'tahun',
  tahun_anggaran: 'tahun',
  pagu: 'pagu',
  realisasi: 'realisasi',
};

const PARTICIPANT_FIELD_MAP: Record<string, string> = {
  kode_tender: 'kode_tender',
  kode_rup: 'kode_rup',
  nama_badan_usaha: 'nama_badan_usaha',
  penyedia: 'nama_badan_usaha',
  perusahaan: 'nama_badan_usaha',
  npwp_hash: 'npwp_hash',
  npwp: 'npwp',
  harga_penawaran: 'harga_penawaran',
  harga_penawaran_menang: 'harga_penawaran',
  penawaran: 'harga_penawaran',
  menang: 'menang',
  pemenang: 'menang',
  is_winner: 'menang',
};

function sanitizeRawRow(raw: EtlRawRow): EtlRawRow {
  const clean: EtlRawRow = {};
  for (const [key, value] of Object.entries(raw)) {
    if (PII_KEYS.has(key.trim().toLowerCase())) continue;
    clean[key] = value;
  }
  return clean;
}

async function rejectRow(
  sourceId: string,
  raw: EtlRawRow,
  lineNumber: number,
  reason: string,
  errors: { baris: number; alasan: string }[],
): Promise<void> {
  errors.push({ baris: lineNumber, alasan: reason });
  await insertEtlError(sourceId, sanitizeRawRow(raw), reason);
}

export function detectExtraImportMode(
  sourceId: string,
  dataset: ParsedRawDataset,
): ExtraImportMode {
  const has = (key: string) => dataset.headers.has(key);
  const isProjectLike = has('kode_rup') && has('nama_paket');

  if (
    sourceId === 'SRC-04' &&
    !isProjectLike &&
    !has('kode_rup') &&
    (has('dinas') || has('satker')) &&
    (has('tahun') || has('tahun_anggaran')) &&
    has('pagu')
  ) {
    return 'anggaran_dinas';
  }

  if (
    sourceId === 'SRC-02' &&
    !has('nama_paket') &&
    (has('nama_badan_usaha') || has('penyedia') || has('perusahaan')) &&
    (has('kode_tender') || has('kode_rup'))
  ) {
    return 'peserta_tender';
  }

  return 'proyek';
}

function parseWinnerFlag(rawValue: string | undefined): { ok: true; value: boolean } | { ok: false; reason: string } {
  const normalized = (rawValue ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'false' || normalized === '0' || normalized === 'tidak' || normalized === 'no') {
    return { ok: true, value: false };
  }
  if (normalized === 'true' || normalized === '1' || normalized === 'ya' || normalized === 'yes') {
    return { ok: true, value: true };
  }
  return { ok: false, reason: 'menang harus bernilai boolean (true/false)' };
}

function normalizeCompanyTaxHash(npwpHashRaw: string | undefined, npwpRaw: string | undefined): string | null {
  const hashVal = (npwpHashRaw ?? '').trim();
  if (hashVal) return hashVal;
  const rawNpwp = (npwpRaw ?? '').trim();
  if (!rawNpwp) return null;
  return createHash('sha256').update(rawNpwp).digest('hex');
}

async function upsertCompanyRecord(
  namaBadanUsaha: string,
  npwpHash: string | null,
  sourceId: string,
  provenanceUrl: string,
): Promise<string> {
  const key = namaBadanUsaha.trim().toLowerCase();
  const existing = await pool.query<{ id: string; npwp_hash: string | null }>(
    'SELECT id, npwp_hash FROM perusahaan WHERE lower(trim(nama_badan_usaha)) = $1 LIMIT 1',
    [key],
  );
  if (existing.rows[0]) {
    if (npwpHash && !existing.rows[0].npwp_hash) {
      await pool.query(
        'UPDATE perusahaan SET npwp_hash = $2, source_id = $3, source_url = $4, fetched_at = now(), is_dummy = false WHERE id = $1',
        [existing.rows[0].id, npwpHash, sourceId, provenanceUrl],
      );
    }
    return existing.rows[0].id;
  }

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO perusahaan (nama_badan_usaha, npwp_hash, source_id, source_url, fetched_at, is_dummy)
     VALUES ($1, $2, $3, $4, now(), false)
     RETURNING id`,
    [namaBadanUsaha.trim(), npwpHash, sourceId, provenanceUrl],
  );
  return inserted.rows[0].id;
}

async function resolveProjectForParticipant(
  kodeTender: string,
  kodeRup: string,
): Promise<{ id: string; dinas: string | null; tahun_anggaran: number | null } | null> {
  if (kodeTender) {
    const byTender = await pool.query<{ id: string; dinas: string | null; tahun_anggaran: number | null }>(
      'SELECT id, dinas, tahun_anggaran FROM proyek WHERE kode_tender = $1 LIMIT 1',
      [kodeTender],
    );
    if (byTender.rows[0]) return byTender.rows[0];
  }
  if (kodeRup) {
    const byRup = await pool.query<{ id: string; dinas: string | null; tahun_anggaran: number | null }>(
      'SELECT id, dinas, tahun_anggaran FROM proyek WHERE kode_rup = $1 LIMIT 1',
      [kodeRup],
    );
    if (byRup.rows[0]) return byRup.rows[0];
  }
  return null;
}

async function ensureTenderForProject(
  projectId: string,
  winningBid: string | null,
  menang: boolean,
  sourceId: string,
  provenanceUrl: string,
): Promise<string> {
  const existing = await pool.query<{ id: string; harga_penawaran_menang: unknown }>(
    `SELECT id, harga_penawaran_menang
       FROM tender
      WHERE proyek_id = $1
      ORDER BY tgl_penetapan DESC NULLS LAST, id DESC
      LIMIT 1`,
    [projectId],
  );
  if (existing.rows[0]) {
    if (menang && winningBid !== null && existing.rows[0].harga_penawaran_menang === null) {
      await pool.query('UPDATE tender SET harga_penawaran_menang = $2 WHERE id = $1', [existing.rows[0].id, winningBid]);
    }
    return existing.rows[0].id;
  }

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO tender (proyek_id, harga_penawaran_menang, source_id, source_url, fetched_at, is_dummy)
     VALUES ($1, $2, $3, $4, now(), false)
     RETURNING id`,
    [projectId, menang ? winningBid : null, sourceId, provenanceUrl],
  );
  return inserted.rows[0].id;
}

export async function importDepartmentBudgets(
  sourceId: string,
  dataset: ParsedRawDataset,
  provenanceUrl: string,
  validKodeBps: Set<string>,
): Promise<ExtraImportSummary> {
  const rows = mapRawRecords(dataset.records, BUDGET_FIELD_MAP);
  let accepted = 0;
  let rejected = 0;
  const errors: { baris: number; alasan: string }[] = [];
  const seenKeys = new Set<string>();
  const affectedScopes = new Map<string, { dinas: string; kodeBps: string; tahun: number }>();

  for (const { normalized, raw, lineNumber } of rows) {
    const dinas = (normalized.dinas ?? '').trim();
    if (!dinas) {
      rejected += 1;
      await rejectRow(sourceId, raw, lineNumber, 'dinas wajib diisi', errors);
      continue;
    }

    const kodeBps = (normalized.kode_bps ?? '').trim();
    if (!kodeBps || !validKodeBps.has(kodeBps)) {
      rejected += 1;
      await rejectRow(sourceId, raw, lineNumber, 'kode_bps tidak terdaftar di wilayah', errors);
      continue;
    }

    const tahunCheck = parseBoundedYear(normalized.tahun, 'tahun');
    if (!tahunCheck.ok) {
      rejected += 1;
      await rejectRow(sourceId, raw, lineNumber, tahunCheck.reason, errors);
      continue;
    }

    const paguCheck = parseNonNegativeBigInt(normalized.pagu, 'pagu', true);
    if (!paguCheck.ok) {
      rejected += 1;
      await rejectRow(sourceId, raw, lineNumber, paguCheck.reason, errors);
      continue;
    }

    let realisasi: string | null = null;
    const realisasiRaw = (normalized.realisasi ?? '').trim();
    if (realisasiRaw) {
      const realisasiCheck = parseNonNegativeBigInt(realisasiRaw, 'realisasi', true);
      if (!realisasiCheck.ok) {
        rejected += 1;
        await rejectRow(sourceId, raw, lineNumber, realisasiCheck.reason, errors);
        continue;
      }
      realisasi = realisasiCheck.value;
    }

    const dedupKey = `${dinas.toLowerCase()}::${kodeBps}::${tahunCheck.value}`;
    if (seenKeys.has(dedupKey)) {
      rejected += 1;
      await rejectRow(sourceId, raw, lineNumber, 'duplikat (dinas, kode_bps, tahun) dalam file', errors);
      continue;
    }
    seenKeys.add(dedupKey);

    await pool.query(
      `INSERT INTO anggaran_dinas (dinas, kode_bps, tahun, pagu, realisasi, source_id, source_url, fetched_at, is_dummy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), false)
       ON CONFLICT (dinas, kode_bps, tahun) DO UPDATE SET
         pagu = EXCLUDED.pagu,
         realisasi = COALESCE(EXCLUDED.realisasi, anggaran_dinas.realisasi),
         source_id = EXCLUDED.source_id,
         source_url = EXCLUDED.source_url,
         fetched_at = EXCLUDED.fetched_at,
         is_dummy = false`,
      [dinas, kodeBps, tahunCheck.value, paguCheck.value, realisasi, sourceId, provenanceUrl],
    );
    accepted += 1;
    affectedScopes.set(dedupKey, { dinas, kodeBps, tahun: tahunCheck.value });
  }

  const projectIds = new Set<string>();
  for (const scope of affectedScopes.values()) {
    const matches = await pool.query<{ id: string }>(
      `SELECT id
         FROM proyek
        WHERE dinas = $1
          AND kode_bps = $2
          AND tahun_anggaran IN ($3, $4)`,
      [scope.dinas, scope.kodeBps, scope.tahun, scope.tahun + 1],
    );
    for (const row of matches.rows) {
      projectIds.add(row.id);
    }
  }
  for (const projectId of projectIds) {
    await recalculateProjectScore(pool, projectId);
  }

  return { totalRows: rows.length, accepted, rejected, errors };
}

export async function importTenderParticipants(
  sourceId: string,
  dataset: ParsedRawDataset,
  provenanceUrl: string,
): Promise<ExtraImportSummary> {
  const rows = mapRawRecords(dataset.records, PARTICIPANT_FIELD_MAP);
  let accepted = 0;
  let rejected = 0;
  const errors: { baris: number; alasan: string }[] = [];
  const seenKeys = new Set<string>();
  const affectedScopes = new Map<string, { dinas: string; tahun: number }>();

  for (const { normalized, raw, lineNumber } of rows) {
    const kodeTender = (normalized.kode_tender ?? '').trim();
    const kodeRup = (normalized.kode_rup ?? '').trim();
    if (!kodeTender && !kodeRup) {
      rejected += 1;
      await rejectRow(sourceId, raw, lineNumber, 'kode_tender atau kode_rup wajib diisi', errors);
      continue;
    }

    const companyName = (normalized.nama_badan_usaha ?? '').trim();
    if (!companyName) {
      rejected += 1;
      await rejectRow(sourceId, raw, lineNumber, 'nama_badan_usaha wajib diisi', errors);
      continue;
    }

    let hargaPenawaran: string | null = null;
    const bidRaw = (normalized.harga_penawaran ?? '').trim();
    if (bidRaw) {
      const bidCheck = parseNonNegativeBigInt(bidRaw, 'harga_penawaran', true);
      if (!bidCheck.ok) {
        rejected += 1;
        await rejectRow(sourceId, raw, lineNumber, bidCheck.reason, errors);
        continue;
      }
      hargaPenawaran = bidCheck.value;
    }

    const menangCheck = parseWinnerFlag(normalized.menang);
    if (!menangCheck.ok) {
      rejected += 1;
      await rejectRow(sourceId, raw, lineNumber, menangCheck.reason, errors);
      continue;
    }

    const project = await resolveProjectForParticipant(kodeTender, kodeRup);
    if (!project) {
      rejected += 1;
      await rejectRow(sourceId, raw, lineNumber, 'proyek untuk kode_tender/kode_rup tidak ditemukan', errors);
      continue;
    }

    const dedupKey = `${project.id}::${companyName.toLowerCase()}`;
    if (seenKeys.has(dedupKey)) {
      rejected += 1;
      await rejectRow(sourceId, raw, lineNumber, 'duplikat peserta tender dalam file', errors);
      continue;
    }
    seenKeys.add(dedupKey);

    const tenderId = await ensureTenderForProject(
      project.id,
      hargaPenawaran,
      menangCheck.value,
      sourceId,
      provenanceUrl,
    );
    const npwpHash = normalizeCompanyTaxHash(normalized.npwp_hash, normalized.npwp);
    const companyId = await upsertCompanyRecord(companyName, npwpHash, sourceId, provenanceUrl);

    await pool.query(
      `INSERT INTO peserta_tender (tender_id, perusahaan_id, harga_penawaran, menang, source_id, source_url, fetched_at, is_dummy)
       VALUES ($1, $2, $3, $4, $5, $6, now(), false)
       ON CONFLICT (tender_id, perusahaan_id) DO UPDATE SET
         harga_penawaran = COALESCE(EXCLUDED.harga_penawaran, peserta_tender.harga_penawaran),
         menang = EXCLUDED.menang,
         source_id = EXCLUDED.source_id,
         source_url = EXCLUDED.source_url,
         fetched_at = EXCLUDED.fetched_at,
         is_dummy = false`,
      [tenderId, companyId, hargaPenawaran, menangCheck.value, sourceId, provenanceUrl],
    );
    accepted += 1;

    if (project.dinas && project.tahun_anggaran !== null) {
      affectedScopes.set(`${project.dinas}::${project.tahun_anggaran}`, {
        dinas: project.dinas,
        tahun: project.tahun_anggaran,
      });
    }
  }

  const projectIds = new Set<string>();
  for (const scope of affectedScopes.values()) {
    const matches = await pool.query<{ id: string }>(
      'SELECT id FROM proyek WHERE dinas = $1 AND tahun_anggaran = $2',
      [scope.dinas, scope.tahun],
    );
    for (const row of matches.rows) {
      projectIds.add(row.id);
    }
  }
  for (const projectId of projectIds) {
    await recalculateProjectScore(pool, projectId);
  }

  return { totalRows: rows.length, accepted, rejected, errors };
}
