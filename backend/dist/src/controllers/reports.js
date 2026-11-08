import { getProjectReports, submitReport, trackReport } from '../services/reports.js';
import { created, ok } from '../middlewares/response.js';
import { invalidateCache } from '../middlewares/cache.js';
import { mediaFilesToUrls } from '../middlewares/upload.js';
export async function createReport(req, res) {
    const body = req.body;
    const files = req.files;
    const report = await submitReport(body, mediaFilesToUrls(files));
    await invalidateCache('reports', 'stats');
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
