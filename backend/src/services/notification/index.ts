import {
  insertNotification,
  updateNotificationStatus,
  getNotificationById,
  getReportSurel,
} from '../../repositories/notification.js';
import { getEmailChannel, hashEmail } from './email-channel.js';
import type { NotificationPayload, NotificationSendStatus } from './types.js';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000];

export interface NotificationOutcome {
  status: NotificationSendStatus;
  galat?: string;
}

export async function triggerNotification(
  tiket: string,
  statusDari: string,
  statusKe: string,
): Promise<NotificationOutcome> {
  try {
    const surel = await getReportSurel(tiket);

    const notif = await insertNotification({
      tiket,
      kanal: 'surel',
      alamat_tujuan_hash: surel ? hashEmail(surel) : null,
      status_dari: statusDari,
      status_ke: statusKe,
    });

    if (!surel) {
      await updateNotificationStatus(notif.id, 'dilewati');
      return { status: 'dilewati' };
    }

    return await attemptSend(notif.id, { tiket, statusDari, statusKe, surelPelapor: surel });
  } catch (err) {
    console.warn('[notification] Gagal memicu notifikasi:', err);
    return { status: 'gagal', galat: err instanceof Error ? err.message : String(err) };
  }
}

async function attemptSend(
  notifId: string,
  payload: NotificationPayload,
  attempt = 0,
): Promise<{ status: NotificationSendStatus; galat?: string }> {
  try {
    const channel = getEmailChannel();
    const result = await channel.send(payload);

    await updateNotificationStatus(notifId, result.status, result.galat);

    if (result.status === 'gagal' && attempt + 1 < MAX_ATTEMPTS) {
      scheduleRetry(notifId, payload, attempt);
    }
    return { status: result.status, galat: result.galat };
  } catch (err) {
    console.warn(`[notification] attemptSend error (attempt ${attempt}):`, err);
    const galat = err instanceof Error ? err.message : String(err);
    try {
      await updateNotificationStatus(notifId, 'gagal', galat);
    } catch (updateErr) {
      console.warn('[notification] Gagal update status gagal:', updateErr);
    }
    if (attempt + 1 < MAX_ATTEMPTS) {
      scheduleRetry(notifId, payload, attempt);
    }
    return { status: 'gagal', galat };
  }
}

function scheduleRetry(notifId: string, payload: NotificationPayload, attempt: number): void {
  const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  setTimeout(() => {
    attemptSend(notifId, payload, attempt + 1).catch((err) =>
      console.warn(`[notification] Retry attempt ${attempt + 1} gagal:`, err),
    );
  }, delay);
}

export async function retryNotification(
  notifId: string,
): Promise<{ id: string; status_kirim: string; percobaan: number } | null> {
  const notif = await getNotificationById(notifId);
  if (!notif) return null;

  const surel = await getReportSurel(notif.tiket);
  if (!surel) {
    await updateNotificationStatus(notif.id, 'dilewati');
    return { id: notif.id, status_kirim: 'dilewati', percobaan: notif.percobaan + 1 };
  }

  await attemptSend(notif.id, {
    tiket: notif.tiket,
    statusDari: notif.status_dari ?? '',
    statusKe: notif.status_ke ?? '',
    surelPelapor: surel,
  });

  const updated = await getNotificationById(notifId);
  return updated
    ? { id: updated.id, status_kirim: updated.status_kirim, percobaan: updated.percobaan }
    : null;
}
