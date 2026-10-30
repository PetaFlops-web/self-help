import type { Request, Response } from 'express';
import { verifyReportByTiket } from '../services/admin-reports.js';
import { updated } from '../middlewares/response.js';
import { invalidateCache } from '../middlewares/cache.js';
import type { VerifyReportInput } from '../types/citizen-report.js';

export async function verifyReport(req: Request<{ id: string }>, res: Response): Promise<void> {
  const id = req.params.id;
  const body = req.body as VerifyReportInput;
  const input: VerifyReportInput = {
    status: body.status,
    catatan_verifikator: body.catatan_verifikator,
    alasan_tolak: body.alasan_tolak,
  };
  const report = await verifyReportByTiket(id, input);
  // Verifikasi laporan memengaruhi daftar laporan, angka ringkas, dan
  // indikator/skor proyek (hitung ulang D3).
  await invalidateCache('reports', 'stats', 'projects');
  updated(res, 'report', report, 'Status laporan berhasil diperbarui');
}
