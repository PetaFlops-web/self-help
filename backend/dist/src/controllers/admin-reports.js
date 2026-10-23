import { verifyReportByTiket } from '../services/admin-reports.js';
import { updated } from '../middlewares/response.js';
export async function verifyReport(req, res) {
    const id = req.params.id;
    const body = req.body;
    const input = {
        status: body.status ?? '',
        catatan_verifikator: body.catatan_verifikator,
        alasan_tolak: body.alasan_tolak,
    };
    const report = await verifyReportByTiket(id, input);
    updated(res, 'report', report, 'Status laporan berhasil diperbarui');
}
