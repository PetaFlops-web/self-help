import { getProjectById, listIndicatorFindingRows, listProjects as listProjectsFromRepository, } from '../repositories/project.js';
import { countReportsByProjectId, listReportsByProjectId, } from '../repositories/citizen-report.js';
import { HttpError, intParam, isUuid, nonNegativeNumberParam, positiveIntParam, strParam } from '../helpers/http.js';
export async function listProjectsByFilters(query) {
    const tahun = intParam(query.tahun_anggaran);
    if (query.tahun_anggaran !== undefined && tahun === undefined) {
        throw new HttpError(400, 'tahun_anggaran harus bilangan bulat');
    }
    const limit = positiveIntParam(query.limit);
    if (query.limit !== undefined && limit === undefined) {
        throw new HttpError(400, 'limit harus bilangan bulat positif');
    }
    const pagu_min = nonNegativeNumberParam(query.pagu_min);
    if (query.pagu_min !== undefined && pagu_min === undefined) {
        throw new HttpError(400, 'pagu_min harus bilangan non-negatif');
    }
    const pagu_max = nonNegativeNumberParam(query.pagu_max);
    if (query.pagu_max !== undefined && pagu_max === undefined) {
        throw new HttpError(400, 'pagu_max harus bilangan non-negatif');
    }
    if (pagu_min !== undefined && pagu_max !== undefined && pagu_min > pagu_max) {
        throw new HttpError(400, 'pagu_min tidak boleh lebih besar dari pagu_max');
    }
    const nilai_kontrak_min = nonNegativeNumberParam(query.nilai_kontrak_min);
    if (query.nilai_kontrak_min !== undefined && nilai_kontrak_min === undefined) {
        throw new HttpError(400, 'nilai_kontrak_min harus bilangan non-negatif');
    }
    const nilai_kontrak_max = nonNegativeNumberParam(query.nilai_kontrak_max);
    if (query.nilai_kontrak_max !== undefined && nilai_kontrak_max === undefined) {
        throw new HttpError(400, 'nilai_kontrak_max harus bilangan non-negatif');
    }
    if (nilai_kontrak_min !== undefined &&
        nilai_kontrak_max !== undefined &&
        nilai_kontrak_min > nilai_kontrak_max) {
        throw new HttpError(400, 'nilai_kontrak_min tidak boleh lebih besar dari nilai_kontrak_max');
    }
    const filters = {
        kode_bps: strParam(query.kode_bps),
        dinas: strParam(query.dinas),
        kategori: strParam(query.kategori),
        tahun_anggaran: tahun,
        q: strParam(query.q),
        pagu_min,
        pagu_max,
        nilai_kontrak_min,
        nilai_kontrak_max,
        limit,
    };
    return listProjectsFromRepository(filters);
}
export async function getProject(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id proyek harus UUID yang valid');
    }
    const proyek = await getProjectById(id);
    if (!proyek) {
        throw new HttpError(404, 'Project tidak ditemukan');
    }
    const [items, total] = await Promise.all([
        listReportsByProjectId(id, 20),
        countReportsByProjectId(id),
    ]);
    return {
        ...proyek,
        laporan_warga: { total, items },
    };
}
export async function getProjectIndicators(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id proyek harus UUID yang valid');
    }
    const proyek = await getProjectById(id);
    if (!proyek) {
        throw new HttpError(404, 'Project tidak ditemukan');
    }
    return listIndicatorFindingRows(id);
}
