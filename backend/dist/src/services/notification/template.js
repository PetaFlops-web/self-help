import { config } from '../../config/env.js';
/**
 * Build email subject and body for a status change notification.
 * Contains ONLY: tiket, status baru, tautan Lacak Laporan.
 * Does NOT contain: narasi, foto, koordinat, catatan_verifikator, alasan_tolak, lembaga_tujuan.
 */
export function buildNotificationEmail(payload) {
    const { tiket, statusKe } = payload;
    const trackUrl = `${config.appBaseUrl}/lacak-laporan?code=${encodeURIComponent(tiket)}`;
    return {
        subject: `Status Laporan ${tiket} Diperbarui`,
        text: [
            `Status laporan Anda dengan nomor tiket ${tiket} telah diperbarui menjadi: ${statusKe}.`,
            '',
            `Lacak laporan Anda di: ${trackUrl}`,
            '',
            'Catatan: Detail laporan tidak dapat ditampilkan dalam surel. Silakan buka tautan di atas untuk informasi lengkap.',
        ].join('\n'),
    };
}
