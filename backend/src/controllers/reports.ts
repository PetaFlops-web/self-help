import type { Request, Response } from 'express';
import { submitReport, trackReport } from '../services/reports.js';
import { created, ok } from '../middlewares/response.js';
import type { CreateReportInput } from '../types/citizen-report.js';

export async function createReport(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<CreateReportInput>;
  const input: CreateReportInput = {
    proyek_id: body.proyek_id ?? '',
    kategori: body.kategori ?? '',
    keterangan: body.keterangan ?? '',
    lat: body.lat ?? null,
    lng: body.lng ?? null,
    foto_urls: Array.isArray(body.foto_urls) ? body.foto_urls : [],
    anonim: !!body.anonim,
  };
  const report = await submitReport(input);
  created(res, 'report', report, 'Laporan berhasil dikirim');
}

export async function getReportByTiket(req: Request, res: Response): Promise<void> {
  const tiket = req.query.tiket;
  const report = await trackReport(typeof tiket === 'string' ? tiket : '');
  ok(res, 'report', report);
}
