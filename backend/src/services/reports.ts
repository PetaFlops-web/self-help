import { getProjectById } from '../repositories/project.js';
import {
  createReport,
  getReportByTiket,
  listPublicReportsByProjectId,
} from '../repositories/citizen-report.js';
import { HttpError, isUuid } from '../helpers/http.js';
import type { CreateReportInput, ReportPublicView } from '../types/citizen-report.js';
import type { ProjectReportItem } from '../types/project.js';

async function assertProjectExists(id: string): Promise<void> {
  if (!isUuid(id)) {
    throw new HttpError(400, 'proyek_id harus UUID yang valid');
  }
  const project = await getProjectById(id);
  if (!project) {
    throw new HttpError(404, 'Project tidak ditemukan');
  }
}

export async function submitReport(input: CreateReportInput): Promise<ReportPublicView> {
  await assertProjectExists(input.proyek_id);

  if (!input.kategori || input.kategori.trim().length === 0) {
    throw new HttpError(400, 'kategori wajib diisi');
  }
  if (!input.keterangan || input.keterangan.trim().length === 0) {
    throw new HttpError(400, 'keterangan wajib diisi');
  }
  if (input.keterangan.length > 4000) {
    throw new HttpError(400, 'keterangan maksimal 4000 karakter');
  }

  return createReport({
    proyek_id: input.proyek_id,
    kategori: input.kategori.trim(),
    keterangan: input.keterangan.trim(),
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    foto_urls: input.foto_urls ?? [],
    anonim: input.anonim ?? false,
  });
}

export async function getProjectReports(
  projectId: string,
  status?: string,
): Promise<ProjectReportItem[]> {
  await assertProjectExists(projectId);
  return listPublicReportsByProjectId(projectId, status);
}

export async function trackReport(tiket: string): Promise<ReportPublicView> {
  if (!tiket || tiket.trim().length === 0) {
    throw new HttpError(400, 'Parameter tiket wajib diisi');
  }
  const report = await getReportByTiket(tiket.trim());
  if (!report) {
    throw new HttpError(404, 'Laporan tidak ditemukan');
  }
  return report;
}
