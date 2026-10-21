import { recalculateProjectScore } from './project-scoring.js';
import { getReportInternal, verifyReport } from '../repositories/citizen-report.js';
import { HttpError } from '../helpers/http.js';
import pool from '../config/database.js';
import type { ReportPublicView, VerifyReportInput } from '../types/citizen-report.js';

const VALID_STATUSES: VerifyReportInput['status'][] = ['Diverifikasi', 'Ditolak'];

export async function verifyReportByTiket(
  tiket: string,
  input: VerifyReportInput,
): Promise<ReportPublicView> {
  if (!tiket || tiket.trim().length === 0) {
    throw new HttpError(400, 'tiket wajib diisi');
  }
  if (!VALID_STATUSES.includes(input.status)) {
    throw new HttpError(400, 'status harus Diverifikasi atau Ditolak');
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

  return updated;
}
