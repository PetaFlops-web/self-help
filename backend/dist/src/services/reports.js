import { getProjectById } from '../repositories/project.js';
import { createReport, getReportByTiket, listPublicReportsByProjectId, } from '../repositories/citizen-report.js';
import { HttpError, isUuid } from '../helpers/http.js';
import { encryptField } from '../helpers/crypto.js';
async function assertProjectExists(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'proyek_id harus UUID yang valid');
    }
    const project = await getProjectById(id);
    if (!project) {
        throw new HttpError(404, 'Project tidak ditemukan');
    }
}
export async function submitReport(body, foto_urls) {
    await assertProjectExists(body.proyek_id);
    if (!body.kategori || body.kategori.trim().length === 0) {
        throw new HttpError(400, 'kategori wajib diisi');
    }
    if (!body.keterangan || body.keterangan.trim().length === 0) {
        throw new HttpError(400, 'keterangan wajib diisi');
    }
    if (body.keterangan.length > 4000) {
        throw new HttpError(400, 'keterangan maksimal 4000 karakter');
    }
    const input = {
        proyek_id: body.proyek_id,
        kategori: body.kategori.trim(),
        keterangan: body.keterangan.trim(),
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        foto_urls,
        anonim: body.anonim ?? false,
        ukuran_lapangan: body.ukuran_lapangan ?? null,
        nama_pelapor: encryptField(body.nama_pelapor ?? null),
        surel_pelapor: body.surel_pelapor ?? null,
        telepon_pelapor: encryptField(body.telepon_pelapor ?? null),
    };
    return createReport(input);
}
export async function getProjectReports(projectId, status) {
    await assertProjectExists(projectId);
    return listPublicReportsByProjectId(projectId, status);
}
export async function trackReport(tiket) {
    if (!tiket || tiket.trim().length === 0) {
        throw new HttpError(400, 'Parameter tiket wajib diisi');
    }
    const report = await getReportByTiket(tiket.trim());
    if (!report) {
        throw new HttpError(404, 'Laporan tidak ditemukan');
    }
    return report;
}
