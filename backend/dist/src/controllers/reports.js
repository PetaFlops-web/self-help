import { submitReport, trackReport } from '../services/reports.js';
import { created, ok } from '../middlewares/response.js';
export async function createReport(req, res) {
    const body = req.body;
    const input = {
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
export async function getReportByTiket(req, res) {
    const tiket = req.query.tiket;
    const report = await trackReport(typeof tiket === 'string' ? tiket : '');
    ok(res, 'report', report);
}
