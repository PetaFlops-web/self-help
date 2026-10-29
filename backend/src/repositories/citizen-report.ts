import pool from '../config/database.js';
import type { ProjectReportItem } from '../types/project.js';
import type {
  CreateReportInput,
  CitizenReport,
  VerifiedReport,
  ReportPublicView,
  VerifyReportInput,
} from '../types/citizen-report.js';

export async function listVerifiedReportsByProjectId(projectId: string): Promise<VerifiedReport[]> {
  const res = await pool.query<{ tiket: string; kategori: string | null; keterangan: string | null }>(
    `SELECT tiket, kategori, keterangan
       FROM laporan_warga
      WHERE proyek_id = $1 AND status = 'Diverifikasi'
      ORDER BY tiket
      LIMIT 20`,
    [projectId],
  );

  return res.rows.map((r) => ({
    tiket: r.tiket,
    kategori: r.kategori,
    ringkasan: wrapReporterData(r.keterangan),
  }));
}

export async function listReportsByProjectId(
  projectId: string,
  limit = 20,
): Promise<ProjectReportItem[]> {
  const res = await pool.query<ProjectReportItem>(
    `SELECT tiket, kategori, status, dibuat_pada, foto_urls, keterangan, anonim
       FROM laporan_warga
      WHERE proyek_id = $1
      ORDER BY dibuat_pada DESC
      LIMIT $2`,
    [projectId, limit],
  );
  return res.rows;
}

export async function listPublicReportsByProjectId(
  projectId: string,
  status?: string,
  limit = 100,
): Promise<ProjectReportItem[]> {
  const params: unknown[] = [projectId];
  let where = 'proyek_id = $1';
  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }
  params.push(limit);
  const res = await pool.query<ProjectReportItem>(
    `SELECT tiket, kategori, status, dibuat_pada, foto_urls, keterangan, anonim
       FROM laporan_warga
      WHERE ${where}
      ORDER BY dibuat_pada DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows;
}

export async function countReportsByProjectId(projectId: string): Promise<number> {
  const res = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM laporan_warga
      WHERE proyek_id = $1`,
    [projectId],
  );
  return res.rows[0]?.count ?? 0;
}

function wrapReporterData(keterangan: string | null): string | null {
  if (!keterangan) return null;
  const cleaned = keterangan
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
  return cleaned.length > 0 ? `<data_pelapor>${cleaned}</data_pelapor>` : null;
}

function toPublicView(
  row: CitizenReport,
  projectDetail?: { nama: string | null; kabupaten: string | null } | null,
): ReportPublicView {
  const showKeterangan = row.status === 'Diverifikasi' || row.status === 'Ditolak';
  return {
    tiket: row.tiket,
    proyek_id: row.proyek_id,
    kategori: row.kategori,
    status: row.status,
    keterangan: showKeterangan ? row.keterangan : null,
    catatan_verifikator: row.catatan_verifikator,
    alasan_tolak: row.alasan_tolak,
    foto_urls: row.foto_urls,
    anonim: row.anonim,
    lat: row.lat,
    lng: row.lng,
    dibuat_pada: row.dibuat_pada,
    diubah_pada: row.diubah_pada,
    proyek: projectDetail ?? null,
  };
}

export async function getProjectDetailForReport(
  projectId: string | null,
): Promise<{ nama: string | null; kabupaten: string | null } | null> {
  if (!projectId) return null;
  const res = await pool.query<{ nama: string | null; kabupaten: string | null }>(
    `SELECT p.nama,
            w.nama AS kabupaten
       FROM proyek p
       LEFT JOIN wilayah w ON w.kode_bps = p.kode_bps
      WHERE p.id = $1`,
    [projectId],
  );
  return res.rows[0] ?? null;
}

function generateTiket(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LPR-${ts}-${rand}`;
}

export async function createReport(input: CreateReportInput): Promise<ReportPublicView> {
  const tiket = generateTiket();
  const res = await pool.query<CitizenReport>(
    `INSERT INTO laporan_warga
       (tiket, proyek_id, kategori, keterangan, lat, lng, foto_urls, anonim, status, dibuat_pada)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Dilaporkan', now())
     RETURNING *`,
    [
      tiket,
      input.proyek_id,
      input.kategori,
      input.keterangan,
      input.lat ?? null,
      input.lng ?? null,
      input.foto_urls ?? null,
      input.anonim ?? false,
    ],
  );
  const projectDetail = await getProjectDetailForReport(input.proyek_id);
  return toPublicView(res.rows[0], projectDetail);
}

export async function getReportByTiket(tiket: string): Promise<ReportPublicView | null> {
  const res = await pool.query<CitizenReport>(
    `SELECT tiket, proyek_id, kategori, keterangan, lat, lng, foto_urls, anonim,
            status, alasan_tolak, catatan_verifikator, dibuat_pada, diubah_pada
       FROM laporan_warga
      WHERE tiket = $1`,
    [tiket],
  );
  if (!res.rows[0]) return null;
  const projectDetail = await getProjectDetailForReport(res.rows[0].proyek_id);
  return toPublicView(res.rows[0], projectDetail);
}

export async function getReportInternal(tiket: string): Promise<CitizenReport | null> {
  const res = await pool.query<CitizenReport>(
    `SELECT tiket, proyek_id, kategori, keterangan, lat, lng, foto_urls, anonim,
            status, alasan_tolak, catatan_verifikator, dibuat_pada, diubah_pada
       FROM laporan_warga
      WHERE tiket = $1`,
    [tiket],
  );
  return res.rows[0] ?? null;
}

export async function verifyReport(
  tiket: string,
  input: VerifyReportInput,
): Promise<ReportPublicView | null> {
  const res = await pool.query<CitizenReport>(
    `UPDATE laporan_warga
        SET status = $2,
            catatan_verifikator = $3,
            alasan_tolak = $4,
            diubah_pada = now()
      WHERE tiket = $1
     RETURNING *`,
    [tiket, input.status, input.catatan_verifikator ?? null, input.alasan_tolak ?? null],
  );
  if (!res.rows[0]) return null;
  const projectDetail = await getProjectDetailForReport(res.rows[0].proyek_id);
  return toPublicView(res.rows[0], projectDetail);
}