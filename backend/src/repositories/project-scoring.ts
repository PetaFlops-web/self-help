import type { Pool, PoolClient } from 'pg';
import type { IndicatorFinding } from '../types/scoring.js';
import type { ProjectRow, RabTotalsRow, TenderRow } from '../types/project.js';

export type DbClient = Pool | PoolClient;

export async function getProjectRow(client: DbClient, projectId: string): Promise<ProjectRow | undefined> {
  const res = await client.query<ProjectRow>(
    'SELECT hps, nilai_kontrak FROM proyek WHERE id = $1',
    [projectId],
  );
  return res.rows[0];
}

export async function getTenderRow(client: DbClient, projectId: string): Promise<TenderRow | undefined> {
  const res = await client.query<TenderRow>(
    `SELECT t.jumlah_penawar,
            t.harga_penawaran_menang,
            (t.tgl_pengumuman - p.pengumuman_rup_tgl) AS hari_rup_ke_tender
       FROM tender t
       JOIN proyek p ON p.id = t.proyek_id
      WHERE t.proyek_id = $1
      ORDER BY t.tgl_penetapan DESC NULLS LAST, t.id DESC
      LIMIT 1`,
    [projectId],
  );
  return res.rows[0];
}

export async function getPaymentDisbursedPercentage(client: DbClient, projectId: string): Promise<unknown> {
  const res = await client.query<{ persen_cair: unknown }>(
    'SELECT COALESCE(SUM(persen_kontrak), 0) AS persen_cair FROM pembayaran WHERE proyek_id = $1',
    [projectId],
  );
  return res.rows[0]?.persen_cair;
}

export async function getPhysicalProgressPercentage(client: DbClient, projectId: string): Promise<unknown> {
  const res = await client.query<{ persen_fisik: unknown }>(
    `SELECT persen_fisik FROM progres
      WHERE proyek_id = $1
      ORDER BY tanggal DESC NULLS LAST, id DESC
      LIMIT 1`,
    [projectId],
  );
  return res.rows[0]?.persen_fisik;
}

export async function getVerifiedReportCount(client: DbClient, projectId: string): Promise<unknown> {
  const res = await client.query<{ jumlah_laporan_terverifikasi: unknown }>(
    `SELECT COUNT(*) AS jumlah_laporan_terverifikasi
       FROM laporan_warga
      WHERE proyek_id = $1 AND status = 'Diverifikasi'`,
    [projectId],
  );
  return res.rows[0]?.jumlah_laporan_terverifikasi;
}

export async function getRabTotalReference(client: DbClient, projectId: string): Promise<unknown> {
  const res = await client.query<RabTotalsRow>(
    `SELECT COALESCE(SUM(ri.volume * ha.harga), 0) AS total_acuan
       FROM rab_item ri
       LEFT JOIN harga_acuan ha ON ha.kode = ri.kode_harga_acuan
      WHERE ri.proyek_id = $1`,
    [projectId],
  );
  return res.rows[0]?.total_acuan;
}

export async function getUnpublishedDocumentSummary(client: DbClient, projectId: string): Promise<{ total: number; wajib: number; belum_publik: number }> {
  const res = await client.query<{ total: number; wajib: number; belum_publik: number }>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE wajib = true)::int AS wajib,
            COUNT(*) FILTER (WHERE wajib = true AND dipublikasikan = false)::int AS belum_publik
       FROM dokumen
      WHERE proyek_id = $1`,
    [projectId],
  );
  return res.rows[0];
}

export async function getUnfulfilledProcedureSummary(client: DbClient, projectId: string): Promise<{ total: number; terpenuhi: number; tidak_terpenuhi: number }> {
  const res = await client.query<{ total: number; terpenuhi: number; tidak_terpenuhi: number }>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE terpenuhi = true)::int AS terpenuhi,
            COUNT(*) FILTER (WHERE terpenuhi = false)::int AS tidak_terpenuhi
       FROM prosedur_checklist
      WHERE proyek_id = $1`,
    [projectId],
  );
  return res.rows[0];
}

export async function updateProjectScore(
  client: DbClient,
  projectId: string,
  skorTotal: number | null,
  kategori: string | null,
): Promise<void> {
  await client.query(
    'UPDATE proyek SET skor_total = $2, kategori = $3 WHERE id = $1',
    [projectId, skorTotal, kategori],
  );
}

export async function deleteIndicatorFindingsByProjectId(client: DbClient, projectId: string): Promise<void> {
  await client.query('DELETE FROM indikator_temuan WHERE proyek_id = $1', [projectId]);
}

export async function insertIndicatorFinding(
  client: DbClient,
  projectId: string,
  f: IndicatorFinding,
): Promise<void> {
  await client.query(
    `INSERT INTO indikator_temuan
       (proyek_id, dimensi, kode_aturan, nilai_terukur, ambang, tingkat,
        bukti_ref, sumber, uraian_aturan, dihitung_pada)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
    [
      projectId,
      f.dimensi,
      f.kode_aturan,
      f.nilai_terukur,
      f.ambang,
      f.tingkat,
      f.bukti_ref ?? null,
      f.sumber,
      f.uraian_aturan,
    ],
  );
}
