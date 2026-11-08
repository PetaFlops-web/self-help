import { listNotifications, retryNotification, runContactRetention } from '../services/notifications.js';
import { HttpError, strParam, positiveIntParam, intParam } from '../helpers/http.js';
import { respond, success } from '../middlewares/response.js';
import { recordAudit } from '../helpers/audit.js';
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function listNotificationsHandler(req, res) {
    const limit = positiveIntParam(req.query.limit);
    if (req.query.limit !== undefined && limit === undefined) {
        throw new HttpError(400, 'limit harus bilangan bulat positif');
    }
    const offset = intParam(req.query.offset);
    if (req.query.offset !== undefined && (offset === undefined || offset < 0)) {
        throw new HttpError(400, 'offset harus bilangan bulat non-negatif');
    }
    const finalLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const finalOffset = offset ?? 0;
    const result = await listNotifications({
        tiket: strParam(req.query.tiket),
        status_kirim: strParam(req.query.status_kirim),
        limit: finalLimit,
        offset: finalOffset,
    });
    // Strip alamat_tujuan_hash from response (26.7: AC-20)
    const rows = result.rows.map((r) => ({
        id: r.id,
        tiket: r.tiket,
        kanal: r.kanal,
        status_dari: r.status_dari,
        status_ke: r.status_ke,
        status_kirim: r.status_kirim,
        percobaan: r.percobaan,
        galat: r.galat,
        dibuat_pada: r.dibuat_pada,
        dikirim_pada: r.dikirim_pada,
    }));
    respond(res, 200, {
        notifications: rows,
        total: result.total,
        limit: finalLimit,
        offset: finalOffset,
    });
}
export async function retryNotificationHandler(req, res) {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id || !UUID_RE.test(id)) {
        throw new HttpError(400, 'id harus UUID yang valid');
    }
    const result = await retryNotification(id);
    if (!result) {
        throw new HttpError(404, 'Notifikasi tidak ditemukan');
    }
    const rawIp = req.headers['x-real-ip'];
    const clientIp = typeof rawIp === 'string' ? rawIp : (req.ip || null);
    await recordAudit({
        aktor_id: req.user?.id ?? null,
        aktor_nama: req.user?.nama ?? 'Unknown',
        peran: req.user?.peran ?? 'system',
        modul: 'notifikasi',
        aksi: 'RETRY_NOTIFICATION',
        target_id: id,
        diff: { status_kirim: result.status_kirim, percobaan: result.percobaan },
        ip: clientIp,
    });
    success(res, 'result', result, 'Notifikasi dikirim ulang');
}
export async function retentionHandler(req, res) {
    const cleared = await runContactRetention();
    const rawIp = req.headers['x-real-ip'];
    const clientIp = typeof rawIp === 'string' ? rawIp : (req.ip || null);
    await recordAudit({
        aktor_id: req.user?.id ?? null,
        aktor_nama: req.user?.nama ?? 'Sistem Retensi',
        peran: req.user?.peran ?? 'system',
        modul: 'notifikasi',
        aksi: 'CONTACT_RETENTION',
        target_id: null,
        diff: { tiket_dibersihkan: cleared },
        ip: clientIp,
    });
    success(res, 'retention', { tiket_dibersihkan: cleared }, 'Retensi kontak dijalankan');
}
