import type { Request, Response } from 'express';
import {
  verifyReportByTiket,
  listAdminReports,
  getAdminReport,
  forwardReportByTiket,
  getReportTrend,
} from '../services/admin-reports.js';
import { listRecapReports } from '../repositories/citizen-report.js';
import { ok, respond } from '../middlewares/response.js';
import { invalidateCache } from '../middlewares/cache.js';
import { recordAudit } from '../helpers/audit.js';
import { HttpError, strParam } from '../helpers/http.js';
import type { VerifyReportInput } from '../types/citizen-report.js';
import type { RecapReportRow } from '../types/citizen-report.js';

function auditActionForStatus(status: string): string {
  if (status === 'Diverifikasi') return 'VERIFY_REPORT';
  if (status === 'Ditolak') return 'REJECT_REPORT';
  return 'UPDATE_STATUS';
}

export async function listReports(req: Request, res: Response): Promise<void> {
  const result = await listAdminReports(req.query as Record<string, unknown>);
  respond(res, 200, {
    reports: result.rows,
    total: result.total,
    total_by_status: result.totalByStatus,
    limit: result.limit,
    offset: result.offset,
  });
}

export async function getReportDetail(req: Request<{ tiket: string }>, res: Response): Promise<void> {
  const report = await getAdminReport(req.params.tiket);
  ok(res, 'report', report);
}

export async function verifyReport(req: Request<{ id: string }>, res: Response): Promise<void> {
  const tiket = req.params.id;
  const body = req.body as VerifyReportInput;
  const input: VerifyReportInput = {
    status: body.status,
    catatan_verifikator: body.catatan_verifikator,
    alasan_tolak: body.alasan_tolak,
  };

  const { report, previousStatus, notification } = await verifyReportByTiket(tiket, input);
  await invalidateCache('reports', 'stats', 'projects');

  const ip = (req.headers['x-real-ip'] as string) || req.ip || null;
  await recordAudit({
    aktor_id: req.user?.id ?? null,
    aktor_nama: req.user?.nama ?? 'unknown',
    peran: req.user?.peran ?? 'unknown',
    modul: 'moderasi',
    aksi: auditActionForStatus(input.status),
    target_id: tiket,
    diff: {
      before: { status: previousStatus },
      after: {
        status: input.status,
        catatan_verifikator: input.catatan_verifikator ?? null,
        alasan_tolak: input.alasan_tolak ?? null,
      },
    },
    ip,
  });

  // Callback error notifikasi: status laporan tetap berubah (fail-safe), tetapi
  // bila pengiriman surel gagal/dilewati, beri tahu admin lewat respons.
  const message =
    notification.status === 'gagal'
      ? 'Status laporan berhasil diperbarui, tetapi notifikasi surel gagal terkirim'
      : 'Status laporan berhasil diperbarui';
  respond(res, 200, {
    message,
    report,
    notification: { status: notification.status, galat: notification.galat ?? null },
  });
}

export async function forwardReport(req: Request<{ tiket: string }>, res: Response): Promise<void> {
  const tiket = req.params.tiket;
  const { lembaga } = req.body as { lembaga: string };

  const { report, previousStatus, notification } = await forwardReportByTiket(tiket, lembaga);
  await invalidateCache('reports', 'stats', 'projects');

  const ip = (req.headers['x-real-ip'] as string) || req.ip || null;
  await recordAudit({
    aktor_id: req.user?.id ?? null,
    aktor_nama: req.user?.nama ?? 'unknown',
    peran: req.user?.peran ?? 'unknown',
    modul: 'moderasi',
    aksi: 'FORWARD_AGENCY',
    target_id: tiket,
    diff: {
      before: { status: previousStatus },
      after: {
        status: 'Diteruskan',
        lembaga_tujuan: lembaga,
      },
    },
    ip,
  });

  const message =
    notification.status === 'gagal'
      ? 'Laporan berhasil diteruskan, tetapi notifikasi surel gagal terkirim'
      : 'Laporan berhasil diteruskan';
  respond(res, 200, {
    message,
    report,
    notification: { status: notification.status, galat: notification.galat ?? null },
  });
}

function escapeHtml(text: string | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date: Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export async function recapReportHandler(req: Request, res: Response): Promise<void> {
  const startDate = strParam(req.query.start_date);
  const endDate = strParam(req.query.end_date);

  if (!startDate || !endDate) {
    throw new HttpError(400, 'Parameter start_date dan end_date wajib diisi (format YYYY-MM-DD)');
  }

  const status = strParam(req.query.status);
  const kodeBps = strParam(req.query.kode_bps);

  const reports = await listRecapReports({
    start_date: startDate,
    end_date: endDate,
    status: status || undefined,
    kode_bps: kodeBps || undefined,
  });

  const hasDummy = reports.some((r) => r.proyek_is_dummy);

  const rows = reports
    .map(
      (r: RecapReportRow) => `
      <tr>
        <td>${escapeHtml(r.tiket)}</td>
        <td>${escapeHtml(r.proyek_nama)}</td>
        <td>${escapeHtml(r.proyek_kabupaten)}</td>
        <td>${escapeHtml(r.kategori)}</td>
        <td>${escapeHtml(r.status)}</td>
        <td>${formatDate(r.dibuat_pada)}</td>
        <td>${escapeHtml(r.catatan_verifikator)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rekap Laporan Verifikasi — Clearsight</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    .badge-dummy {
      display: inline-block; background: #fff3cd; color: #856404;
      padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;
      margin-left: 8px;
    }
    .footer-disclaimer {
      margin-top: 20px; padding: 12px 16px; background: #f8f9fa;
      border-left: 4px solid #f4532f; font-size: 11px; color: #555;
    }
    .footer-disclaimer strong { color: #b3321b; }
    @media print {
      body { padding: 0; }
      .footer-disclaimer {
        position: fixed; bottom: 0; left: 0; right: 0;
        background: #fff; border-top: 2px solid #f4532f; border-left: none;
      }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>Rekapitulasi Laporan Verifikasi${hasDummy ? '<span class="badge-dummy">DATA SIMULASI</span>' : ''}</h1>
  <p class="meta">
    Periode: ${escapeHtml(startDate)} s/d ${escapeHtml(endDate)}
    ${status ? `· Status: ${escapeHtml(status)}` : ''}
    ${kodeBps ? `· Wilayah: ${escapeHtml(kodeBps)}` : ''}
    · Total: ${reports.length} laporan
  </p>
  <table>
    <thead>
      <tr>
        <th>Tiket</th>
        <th>Proyek</th>
        <th>Kabupaten</th>
        <th>Kategori</th>
        <th>Status</th>
        <th>Dibuat</th>
        <th>Catatan Verifikator</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#999;">Tidak ada laporan pada rentang ini</td></tr>'}</tbody>
  </table>
  <div class="footer-disclaimer">
    <strong>Penafian:</strong> Indikator risiko pada platform ini disajikan untuk diperiksa, bukan sebagai bukti pelanggaran.
    Data dalam rekap ini bersumber dari laporan warga dan verifikasi internal. Label DATA SIMULASI menandakan data belum bersumber dari dokumen resmi.
  </div>
</body>
</html>`;

  const rawIp = req.headers['x-real-ip'];
  const clientIp = typeof rawIp === 'string' ? rawIp : (req.ip || null);
  await recordAudit({
    aktor_id: req.user?.id ?? null,
    aktor_nama: req.user?.nama ?? 'Unknown',
    peran: req.user?.peran ?? 'system',
    modul: 'rekap',
    aksi: 'PRINT_RECAP',
    target_id: null,
    diff: { start_date: startDate, end_date: endDate, status: status ?? null, kode_bps: kodeBps ?? null, total: reports.length },
    ip: clientIp,
  });

  res.type('text/html').send(html);
}

export async function reportTrendHandler(req: Request, res: Response): Promise<void> {
  const rawDays = req.query.days;
  const daysNum = typeof rawDays === 'string' ? parseInt(rawDays, 10) : undefined;
  const trend = await getReportTrend(daysNum);
  ok(res, 'trend', trend);
}
