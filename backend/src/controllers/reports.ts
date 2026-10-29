import type { Request, Response } from 'express';
import { getProjectReports, submitReport, trackReport } from '../services/reports.js';
import { created, ok } from '../middlewares/response.js';
import { mediaFilesToUrls } from '../middlewares/upload.js';
import type { CreateReportInput } from '../types/citizen-report.js';
import type { CreateReportBody } from '../utils/validators/reports.js';

export async function createReport(req: Request, res: Response): Promise<void> {
  // req.body sudah divalidasi & di-coerce oleh validateBody(CreateReportBodySchema).
  const body = req.body as CreateReportBody;
  const files = req.files as Express.Multer.File[] | undefined;

  const input: CreateReportInput = {
    proyek_id: body.proyek_id,
    kategori: body.kategori,
    keterangan: body.keterangan,
    lat: body.lat ?? null,
    lng: body.lng ?? null,
    foto_urls: mediaFilesToUrls(files),
    anonim: body.anonim ?? false,
  };
  const report = await submitReport(input);
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
