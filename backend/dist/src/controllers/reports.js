import { getProjectReports, submitReport, trackReport } from '../services/reports.js';
import { created, ok } from '../middlewares/response.js';
import { mediaFilesToUrls } from '../middlewares/upload.js';
export async function createReport(req, res) {
    // req.body sudah divalidasi & di-coerce oleh validateBody(CreateReportBodySchema).
    const body = req.body;
    const files = req.files;
    const input = {
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
export async function getReportByTiket(req, res) {
    const tiket = req.query.tiket;
    const report = await trackReport(typeof tiket === 'string' ? tiket : '');
    ok(res, 'report', report);
}
export async function listProjectReports(req, res) {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const reports = await getProjectReports(req.params.id, status);
    ok(res, 'reports', reports);
}
