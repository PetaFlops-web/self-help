import { verifyReportByTiket, listAdminReports, getAdminReport, forwardReportByTiket, } from '../services/admin-reports.js';
import { ok, updated, respond } from '../middlewares/response.js';
import { invalidateCache } from '../middlewares/cache.js';
import { recordAudit } from '../helpers/audit.js';
function auditActionForStatus(status) {
    if (status === 'Diverifikasi')
        return 'VERIFY_REPORT';
    if (status === 'Ditolak')
        return 'REJECT_REPORT';
    return 'UPDATE_STATUS';
}
export async function listReports(req, res) {
    const result = await listAdminReports(req.query);
    respond(res, 200, {
        reports: result.rows,
        total: result.total,
        total_by_status: result.totalByStatus,
        limit: result.limit,
        offset: result.offset,
    });
}
export async function getReportDetail(req, res) {
    const report = await getAdminReport(req.params.tiket);
    ok(res, 'report', report);
}
export async function verifyReport(req, res) {
    const tiket = req.params.id;
    const body = req.body;
    const input = {
        status: body.status,
        catatan_verifikator: body.catatan_verifikator,
        alasan_tolak: body.alasan_tolak,
    };
    const { report, previousStatus } = await verifyReportByTiket(tiket, input);
    await invalidateCache('reports', 'stats', 'projects');
    const ip = req.headers['x-real-ip'] || req.ip || null;
    await recordAudit({
        aktor_id: req.user?.id ?? null,
        aktor_nama: req.user?.nama ?? 'unknown',
        peran: req.user?.peran ?? 'unknown',
        modul: 'moderasi',
        aksi: auditActionForStatus(input.status),
        target_id: tiket,
        diff: {
            before: { status: previousStatus },
            after: {
                status: input.status,
                catatan_verifikator: input.catatan_verifikator ?? null,
                alasan_tolak: input.alasan_tolak ?? null,
            },
        },
        ip,
    });
    updated(res, 'report', report, 'Status laporan berhasil diperbarui');
}
export async function forwardReport(req, res) {
    const tiket = req.params.tiket;
    const { lembaga } = req.body;
    const { report, previousStatus } = await forwardReportByTiket(tiket, lembaga);
    await invalidateCache('reports', 'stats', 'projects');
    const ip = req.headers['x-real-ip'] || req.ip || null;
    await recordAudit({
        aktor_id: req.user?.id ?? null,
        aktor_nama: req.user?.nama ?? 'unknown',
        peran: req.user?.peran ?? 'unknown',
        modul: 'moderasi',
        aksi: 'FORWARD_AGENCY',
        target_id: tiket,
        diff: {
            before: { status: previousStatus },
            after: {
                status: 'Diteruskan',
                lembaga_tujuan: lembaga,
            },
        },
        ip,
    });
    updated(res, 'report', report, 'Laporan berhasil diteruskan');
}
