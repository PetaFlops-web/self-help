import { recalculateProjectScore } from './project-scoring.js';
import { triggerNotification, type NotificationOutcome } from './notification/index.js';
import {
  getReportInternal,
  verifyReport,
  listAdminReports as listAdminReportsFromRepo,
  getAdminReportDetail,
  forwardReport,
  countReportsByStatus,
} from '../repositories/citizen-report.js';
import { HttpError, strParam, positiveIntParam, intParam } from '../helpers/http.js';
import pool from '../config/database.js';
import type {
  ReportPublicView,
  VerifyReportInput,
  AdminReportListItem,
  AdminReportDetail,
} from '../types/citizen-report.js';

const TRANSITIONS: Record<string, string[]> = {
  Dilaporkan: ['Diverifikasi', 'Ditolak'],
  Diverifikasi: ['Diteruskan', 'Selesai'],
  Diteruskan: ['Ditindaklanjuti'],
  Ditindaklanjuti: ['Selesai'],
};

function isTransitionValid(from: string, to: string): boolean {
  const allowed = TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export async function verifyReportByTiket(
  tiket: string,
  input: VerifyReportInput,
): Promise<{ report: ReportPublicView; previousStatus: string; notification: NotificationOutcome }> {
  if (!tiket || tiket.trim().length === 0) {
    throw new HttpError(400, 'tiket wajib diisi');
  }
  if (input.status === 'Ditolak' && (!input.alasan_tolak || input.alasan_tolak.trim().length === 0)) {
    throw new HttpError(400, 'alasan_tolak wajib diisi saat menolak laporan');
  }

  const existing = await getReportInternal(tiket);
  if (!existing) {
    throw new HttpError(404, 'Laporan tidak ditemukan');
  }
  if (existing.status === input.status) {
    throw new HttpError(409, `Laporan sudah berstatus ${input.status}`);
  }
  if (!isTransitionValid(existing.status, input.status)) {
    throw new HttpError(
      400,
      `Transisi status tidak sah: ${existing.status} → ${input.status}`,
    );
  }

  const updated = await verifyReport(tiket, {
    status: input.status,
    catatan_verifikator: input.catatan_verifikator,
    alasan_tolak: input.alasan_tolak,
  });
  if (!updated) {
    throw new HttpError(500, 'Gagal memperbarui laporan');
  }

  if (input.status === 'Diverifikasi' && existing.proyek_id) {
    await recalculateProjectScore(pool, existing.proyek_id);
  }

  // Fail-safe notification trigger (NFR-23): status laporan sudah berubah di
  // atas; hasil pengiriman hanya dilaporkan, tidak pernah menggagalkan operasi.
  const notification = await triggerNotification(tiket, existing.status, input.status);

  return { report: updated, previousStatus: existing.status, notification };
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function listAdminReports(
  query: Record<string, unknown>,
): Promise<{
  rows: AdminReportListItem[];
  total: number;
  totalByStatus: Record<string, number>;
  limit: number;
  offset: number;
}> {
  const limit = positiveIntParam(query.limit);
  if (query.limit !== undefined && limit === undefined) {
    throw new HttpError(400, 'limit harus bilangan bulat positif');
  }
  const offset = intParam(query.offset);
  if (query.offset !== undefined && (offset === undefined || offset < 0)) {
    throw new HttpError(400, 'offset harus bilangan bulat non-negatif');
  }

  const finalLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const finalOffset = offset ?? 0;

  const result = await listAdminReportsFromRepo({
    status: strParam(query.status),
    kategori: strParam(query.kategori),
    kode_bps: strParam(query.kode_bps),
    limit: finalLimit,
    offset: finalOffset,
  });

  const totalByStatus = await countReportsByStatus();

  return {
    rows: result.rows,
    total: result.total,
    totalByStatus,
    limit: finalLimit,
    offset: finalOffset,
  };
}

export async function getAdminReport(tiket: string): Promise<AdminReportDetail> {
  if (!tiket || tiket.trim().length === 0) {
    throw new HttpError(400, 'tiket wajib diisi');
  }
  const report = await getAdminReportDetail(tiket);
  if (!report) {
    throw new HttpError(404, 'Laporan tidak ditemukan');
  }
  return report;
}

export async function forwardReportByTiket(
  tiket: string,
  lembaga: string,
): Promise<{ report: ReportPublicView; previousStatus: string; notification: NotificationOutcome }> {
  if (!tiket || tiket.trim().length === 0) {
    throw new HttpError(400, 'tiket wajib diisi');
  }

  const existing = await getReportInternal(tiket);
  if (!existing) {
    throw new HttpError(404, 'Laporan tidak ditemukan');
  }
  if (!isTransitionValid(existing.status, 'Diteruskan')) {
    throw new HttpError(
      400,
      `Laporan dengan status ${existing.status} tidak dapat diteruskan`,
    );
  }

  const updated = await forwardReport(tiket, lembaga);
  if (!updated) {
    throw new HttpError(500, 'Gagal meneruskan laporan');
  }

  // Fail-safe notification trigger (NFR-23): lihat catatan di verifyReportByTiket.
  const notification = await triggerNotification(tiket, existing.status, 'Diteruskan');

  return { report: updated, previousStatus: existing.status, notification };
}
