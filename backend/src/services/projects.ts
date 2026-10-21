import {
  getProyekById,
  listIndikatorTemuan,
  listProyek,
} from '../repositories/proyek.js';
import { HttpError, intParam, isUuid, positiveIntParam, strParam } from '../helpers/http.js';
import type { IndikatorTemuan, Proyek, ProyekFilters } from '../types/proyek.js';

export async function listProjects(query: Record<string, unknown>): Promise<Proyek[]> {
  const tahun = intParam(query.tahun_anggaran);
  if (query.tahun_anggaran !== undefined && tahun === undefined) {
    throw new HttpError(400, 'tahun_anggaran harus bilangan bulat');
  }

  const limit = positiveIntParam(query.limit);
  if (query.limit !== undefined && limit === undefined) {
    throw new HttpError(400, 'limit harus bilangan bulat positif');
  }

  const filters: ProyekFilters = {
    kode_bps: strParam(query.kode_bps),
    dinas: strParam(query.dinas),
    kategori: strParam(query.kategori),
    tahun_anggaran: tahun,
    limit,
  };

  return listProyek(filters);
}

export async function getProject(id: string): Promise<Proyek> {
  if (!isUuid(id)) {
    throw new HttpError(400, 'id proyek harus UUID yang valid');
  }
  const proyek = await getProyekById(id);
  if (!proyek) {
    throw new HttpError(404, 'Proyek tidak ditemukan');
  }
  return proyek;
}

export async function getProjectIndicators(id: string): Promise<IndikatorTemuan[]> {
  if (!isUuid(id)) {
    throw new HttpError(400, 'id proyek harus UUID yang valid');
  }
  const proyek = await getProyekById(id);
  if (!proyek) {
    throw new HttpError(404, 'Proyek tidak ditemukan');
  }
  return listIndikatorTemuan(id);
}
