import type { Request, Response } from 'express';
import { getProjectReports, submitReport, trackReport } from '../services/reports.js';
import { created, ok } from '../middlewares/response.js';
import { invalidateCache } from '../middlewares/cache.js';
import { mediaFilesToUrls } from '../middlewares/upload.js';
import type { CreateReportBody } from '../utils/validators/reports.js';

export async function createReport(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateReportBody;
  const files = req.files as Express.Multer.File[] | undefined;

  const report = await submitReport(body, mediaFilesToUrls(files));
  await invalidateCache('reports', 'stats');
  created(res, 'report', report, 'Laporan berhasil dikirim');
}

export async function getReportByTiket(req: Request, res: Response): Promise<void> {
  const tiket = req.query.tiket;
  const report = await trackReport(typeof tiket === 'string' ? tiket : '');
  ok(res, 'report', report);
}

export async function listProjectReports(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const reports = await getProjectReports(req.params.id, status);
  ok(res, 'reports', reports);
}
