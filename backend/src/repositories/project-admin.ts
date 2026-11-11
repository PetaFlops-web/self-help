import pool from '../config/database.js';
import type { DbClient } from './project-scoring.js';

export interface ProjectAdminRow {
  id: string;
  kode_rup: string | null;
  kode_tender: string | null;
  nama: string;
  dinas: string | null;
  kode_bps: string | null;
  tahun_anggaran: number;
  sumber_dana: string | null;
  metode_pemilihan: string | null;
  pagu: string | null;
  hps: string | null;
  nilai_kontrak: string | null;
  status: string | null;
  pengumuman_rup_tgl: string | null;
  asal_data: string;
  skor_total: string | null;
  kategori: string | null;
}

export interface TenderAdminRow {
  id: string;
  proyek_id: string;
  jumlah_penawar: number | null;
  jumlah_peserta: number | null;
  harga_penawaran_menang: string | null;
  tgl_pengumuman: string | null;
  tgl_penetapan: string | null;
}

export interface ValueHistoryRow {
  id: string;
  proyek_id: string;
  kolom: string;
  nilai_lama: string | null;
  nilai_baru: string | null;
  skor_sebelum: string | null;
  skor_sesudah: string | null;
  aktor_nama: string | null;
  peran: string | null;
  waktu: Date;
}

export interface ScoreTriggerSnapshot {
  pagu: string | null;
  hps: string | null;
  nilai_kontrak: string | null;
  jumlah_penawar: string | null;
  hari_rup_ke_tender: string | null;
}

export const SCORE_TRIGGER_COLUMNS: (keyof ScoreTriggerSnapshot)[] = [
  'pagu',
  'hps',
  'nilai_kontrak',
  'jumlah_penawar',
  'hari_rup_ke_tender',
];

const PROJECT_SELECT = `
  id, kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran,
  sumber_dana, metode_pemilihan, pagu::text AS pagu, hps::text AS hps,
  nilai_kontrak::text AS nilai_kontrak, status,
  to_char(pengumuman_rup_tgl, 'YYYY-MM-DD') AS pengumuman_rup_tgl,
  asal_data, skor_total::text AS skor_total, kategori
`;

const TENDER_SELECT = `
  id, proyek_id, jumlah_penawar, jumlah_peserta,
  harga_penawaran_menang::text AS harga_penawaran_menang,
  to_char(tgl_pengumuman, 'YYYY-MM-DD') AS tgl_pengumuman,
  to_char(tgl_penetapan, 'YYYY-MM-DD') AS tgl_penetapan
`;

export const PROJECT_WRITABLE_FIELDS = [
  'nama', 'dinas', 'kode_bps', 'tahun_anggaran', 'pagu', 'kode_rup', 'kode_tender',
  'hps', 'nilai_kontrak', 'sumber_dana', 'metode_pemilihan', 'pengumuman_rup_tgl', 'status',
] as const;

export const TENDER_WRITABLE_FIELDS = [
  'jumlah_penawar', 'harga_penawaran_menang', 'tgl_pengumuman', 'tgl_penetapan',
] as const;

export async function checkKodeBpsExists(client: DbClient, kodeBps: string): Promise<boolean> {
  const res = await client.query('SELECT 1 FROM wilayah WHERE kode_bps = $1', [kodeBps]);
  return (res.rowCount ?? 0) > 0;
}

export async function checkKodeRupExists(client: DbClient, kodeRup: string, excludeId?: string): Promise<boolean> {
  const res = await client.query(
    'SELECT 1 FROM proyek WHERE kode_rup = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)',
    [kodeRup, excludeId ?? null],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function checkKodeTenderExists(client: DbClient, kodeTender: string, excludeId?: string): Promise<boolean> {
  const res = await client.query(
    'SELECT 1 FROM proyek WHERE kode_tender = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)',
    [kodeTender, excludeId ?? null],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function getProjectForAdmin(
  client: DbClient,
  id: string,
  forUpdate = false,
): Promise<ProjectAdminRow | null> {
  const res = await client.query<ProjectAdminRow>(
    `SELECT ${PROJECT_SELECT} FROM proyek WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function getScoreTriggerSnapshot(client: DbClient, projectId: string): Promise<ScoreTriggerSnapshot> {
  const res = await client.query<ScoreTriggerSnapshot>(
    `SELECT p.pagu::text AS pagu,
            p.hps::text AS hps,
            p.nilai_kontrak::text AS nilai_kontrak,
            t.jumlah_penawar::text AS jumlah_penawar,
            (t.tgl_pengumuman - p.pengumuman_rup_tgl)::text AS hari_rup_ke_tender
       FROM proyek p
       LEFT JOIN LATERAL (
         SELECT jumlah_penawar, tgl_pengumuman
           FROM tender
          WHERE proyek_id = p.id
          ORDER BY tgl_penetapan DESC NULLS LAST, id DESC
          LIMIT 1
       ) t ON true
      WHERE p.id = $1`,
    [projectId],
  );
  return res.rows[0] ?? {
    pagu: null, hps: null, nilai_kontrak: null, jumlah_penawar: null, hari_rup_ke_tender: null,
  };
}

export async function createProjectAdmin(
  client: DbClient,
  data: Record<string, unknown>,
  createdBy: string | null,
): Promise<string> {
  const cols: string[] = ['asal_data', 'dibuat_oleh', 'dibuat_pada', 'match_status', 'is_dummy'];
  const vals: unknown[] = ['manual_admin', createdBy, new Date(), 'unmatched', false];

  for (const col of PROJECT_WRITABLE_FIELDS) {
    if (data[col] !== undefined && data[col] !== null) {
      cols.push(col);
      vals.push(data[col]);
    }
  }

  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const res = await client.query<{ id: string }>(
    `INSERT INTO proyek (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    vals,
  );
  return res.rows[0].id;
}

export async function updateProjectAdmin(
  client: DbClient,
  id: string,
  data: Record<string, unknown>,
  updatedBy: string | null,
): Promise<void> {
  const sets: string[] = ['diubah_oleh = $1', 'diubah_pada = $2'];
  const vals: unknown[] = [updatedBy, new Date()];

  for (const col of PROJECT_WRITABLE_FIELDS) {
    if (data[col] !== undefined) {
      vals.push(data[col]);
      sets.push(`${col} = $${vals.length}`);
    }
  }

  vals.push(id);
  await client.query(`UPDATE proyek SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
}

export async function deleteProjectCascade(client: DbClient, projectId: string): Promise<void> {
  await client.query('UPDATE laporan_warga SET proyek_id = NULL WHERE proyek_id = $1', [projectId]);
  await client.query(
    'DELETE FROM peserta_tender WHERE tender_id IN (SELECT id FROM tender WHERE proyek_id = $1)',
    [projectId],
  );
  for (const table of ['penjelasan_llm', 'indikator_temuan', 'rab_item', 'progres', 'pembayaran', 'tender', 'prosedur_checklist', 'dokumen']) {
    await client.query(`DELETE FROM ${table} WHERE proyek_id = $1`, [projectId]);
  }
  await client.query('DELETE FROM proyek_pencocokan WHERE proyek_id = $1 OR pasangan_id = $1', [projectId]);
  await client.query('DELETE FROM proyek WHERE id = $1', [projectId]);
}

export async function insertRiwayatNilai(
  client: DbClient,
  input: {
    proyek_id: string;
    kolom: string;
    nilai_lama: string | null;
    nilai_baru: string | null;
    skor_sebelum: number | null;
    skor_sesudah: number | null;
    aktor_id: string | null;
    aktor_nama: string;
    peran: string;
    ip: string | null;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO riwayat_nilai (proyek_id, kolom, nilai_lama, nilai_baru, skor_sebelum, skor_sesudah, aktor_id, aktor_nama, peran, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [input.proyek_id, input.kolom, input.nilai_lama, input.nilai_baru, input.skor_sebelum, input.skor_sesudah, input.aktor_id, input.aktor_nama, input.peran, input.ip],
  );
}

export async function listValueHistory(
  projectId: string,
  limit: number,
  offset: number,
): Promise<{ rows: ValueHistoryRow[]; total: number }> {
  const countRes = await pool.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM riwayat_nilai WHERE proyek_id = $1',
    [projectId],
  );
  const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

  const res = await pool.query<ValueHistoryRow>(
    `SELECT id, proyek_id, kolom, nilai_lama, nilai_baru,
            skor_sebelum::text AS skor_sebelum, skor_sesudah::text AS skor_sesudah,
            aktor_nama, peran, waktu
       FROM riwayat_nilai
      WHERE proyek_id = $1
      ORDER BY waktu DESC, id DESC
      LIMIT $2 OFFSET $3`,
    [projectId, limit, offset],
  );
  return { rows: res.rows, total };
}

export async function getTenderById(client: DbClient, id: string, forUpdate = false): Promise<TenderAdminRow | null> {
  const res = await client.query<TenderAdminRow>(
    `SELECT ${TENDER_SELECT} FROM tender WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function getTendersByProjectId(
  client: DbClient,
  projectId: string,
): Promise<TenderAdminRow[]> {
  const res = await client.query<TenderAdminRow>(
    `SELECT ${TENDER_SELECT} FROM tender WHERE proyek_id = $1 ORDER BY tgl_penetapan DESC NULLS LAST, id DESC`,
    [projectId],
  );
  return res.rows;
}

export async function createTenderAdmin(
  client: DbClient,
  proyekId: string,
  data: Record<string, unknown>,
): Promise<string> {
  const res = await client.query<{ id: string }>(
    `INSERT INTO tender (proyek_id, jumlah_penawar, jumlah_peserta, harga_penawaran_menang, tgl_pengumuman, tgl_penetapan, is_dummy)
     VALUES ($1, $2, $2, $3, $4, $5, false)
     RETURNING id`,
    [proyekId, data.jumlah_penawar ?? 0, data.harga_penawaran_menang ?? null, data.tgl_pengumuman ?? null, data.tgl_penetapan ?? null],
  );
  return res.rows[0].id;
}

export async function updateTenderAdmin(
  client: DbClient,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];

  for (const col of TENDER_WRITABLE_FIELDS) {
    if (data[col] !== undefined) {
      vals.push(data[col]);
      sets.push(`${col} = $${vals.length}`);
    }
  }
  if (sets.length === 0) return;

  vals.push(id);
  await client.query(`UPDATE tender SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
}

export async function deleteTenderAdmin(client: DbClient, id: string): Promise<void> {
  await client.query('DELETE FROM peserta_tender WHERE tender_id = $1', [id]);
  await client.query('DELETE FROM tender WHERE id = $1', [id]);
}
