import type { Request, Response } from 'express';
import {
  verifyReportByTiket,
  listAdminReports,
  getAdminReport,
  forwardReportByTiket,
} from '../services/admin-reports.js';
import { ok, respond } from '../middlewares/response.js';
import { invalidateCache } from '../middlewares/cache.js';
import { recordAudit } from '../helpers/audit.js';
import type { VerifyReportInput } from '../types/citizen-report.js';

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
