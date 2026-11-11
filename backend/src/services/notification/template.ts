import { config } from '../../config/env.js';
import type { NotificationPayload } from './types.js';

interface StatusBadgeStyle {
  bg: string;
  color: string;
  border: string;
}

const STATUS_BADGE_STYLES: Record<string, StatusBadgeStyle> = {
  Dilaporkan: { bg: '#EBF2FC', color: '#2F6FDE', border: '#CFE0FA' },
  Diverifikasi: { bg: '#E3F2EA', color: '#2E8B57', border: '#BCE2CD' },
  Diteruskan: { bg: '#EBF2FC', color: '#2F6FDE', border: '#CFE0FA' },
  Ditindaklanjuti: { bg: '#FDF0D8', color: '#D97706', border: '#F6DBA8' },
  Selesai: { bg: '#E3F2EA', color: '#2E8B57', border: '#BCE2CD' },
  Ditolak: { bg: '#FCE4DF', color: '#D63A1F', border: '#F5C1B7' },
};

const DEFAULT_BADGE_STYLE: StatusBadgeStyle = {
  bg: '#EBE7E2',
  color: '#111111',
  border: '#DCD8D0',
};

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

function getStatusBadgeStyle(status: string): StatusBadgeStyle {
  return STATUS_BADGE_STYLES[status] ?? DEFAULT_BADGE_STYLE;
}

function renderNotificationHtml(params: {
  tiket: string;
  statusKe: string;
  trackUrl: string;
}): string {
  const safeTiket = escapeHtml(params.tiket);
  const safeStatus = escapeHtml(params.statusKe);
  const safeUrl = escapeHtml(params.trackUrl);
  const badge = getStatusBadgeStyle(params.statusKe);
  const preheader = `Status laporan ${safeTiket} diperbarui menjadi ${safeStatus}. Buka Lacak Laporan untuk rincian lengkap.`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Status Laporan ${safeTiket} Diperbarui</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F2EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;">
  <div style="display:none;font-size:1px;color:#F4F2EE;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F2EE" style="background-color:#F4F2EE;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width:560px;background-color:#FFFFFF;border:1px solid #E7E3DC;border-radius:12px;overflow:hidden;">
          <tr>
            <td bgcolor="#FF6B2B" style="height:4px;background-color:#FF6B2B;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 28px 18px 28px;border-bottom:1px solid #EBE7E2;">
              <p style="margin:0;line-height:1;">
                <span style="display:inline-block;width:10px;height:10px;background-color:#FF6B2B;border-radius:3px;vertical-align:middle;margin-right:8px;"></span><span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#111111;vertical-align:middle;">Clearsight</span>
              </p>
              <p style="margin:6px 0 0 0;font-size:12px;line-height:1.4;color:#6B6760;">Transparansi Proyek Infrastruktur Publik</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 24px 28px;">
              <h1 style="margin:0 0 10px 0;font-size:20px;line-height:1.3;font-weight:700;color:#111111;">Pembaruan Status Laporan</h1>
              <p style="margin:0 0 22px 0;font-size:14px;line-height:1.6;color:#2B2B2B;">Status laporan warga Anda dengan nomor tiket berikut telah diperbarui.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F8F7F4" style="background-color:#F8F7F4;border:1px solid #E7E3DC;border-radius:10px;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:14px 18px;font-size:12px;color:#6B6760;border-bottom:1px solid #EBE7E2;width:42%;">Nomor Tiket</td>
                  <td align="right" style="padding:14px 18px;border-bottom:1px solid #EBE7E2;">
                    <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:13px;font-weight:700;color:#111111;background-color:#FFFFFF;border:1px solid #DCD8D0;border-radius:6px;padding:4px 10px;">${safeTiket}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;font-size:12px;color:#6B6760;">Status Terbaru</td>
                  <td align="right" style="padding:14px 18px;">
                    <span style="display:inline-block;font-size:12px;font-weight:700;color:${badge.color};background-color:${badge.bg};border:1px solid ${badge.border};border-radius:999px;padding:4px 12px;">${safeStatus}</span>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
                <tr>
                  <td align="center" bgcolor="#111111" style="background-color:#111111;border-radius:8px;">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;">Lacak Laporan</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 22px 0;font-size:12px;line-height:1.6;color:#6B6760;">
                Jika tombol di atas tidak berfungsi, salin dan buka tautan berikut di peramban Anda:<br />
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#C2410C;word-break:break-all;text-decoration:underline;">${safeUrl}</a>
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFF2EB" style="background-color:#FFF2EB;border:1px solid #F7D4C2;border-radius:8px;">
                <tr>
                  <td style="padding:12px 14px;font-size:12px;line-height:1.55;color:#6B3418;">
                    <strong>Catatan Keamanan:</strong> Demi melindungi privasi Anda, detail laporan tidak ditampilkan di dalam surel. Silakan buka halaman Lacak Laporan dengan nomor tiket Anda untuk melihat informasi lengkap.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#F8F7F4" style="padding:16px 28px;background-color:#F8F7F4;border-top:1px solid #EBE7E2;">
              <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#2B2B2B;">Clearsight</p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#9A958C;">Surel ini dikirim secara otomatis oleh sistem. Mohon tidak membalas surel ini.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildNotificationEmail(payload: NotificationPayload): {
  subject: string;
  text: string;
  html: string;
} {
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
    html: renderNotificationHtml({ tiket, statusKe, trackUrl }),
  };
}
