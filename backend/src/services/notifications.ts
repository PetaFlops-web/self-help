import {
  listNotifications as listNotificationsRepo,
  getNotificationById,
  getReportSurel,
  updateNotificationStatus,
  listNotificationsForRetention,
  clearReportContact,
} from '../repositories/notification.js';
import { retryNotification as retryNotifService } from './notification/index.js';
import type { NotificationRow } from '../repositories/notification.js';

const MAX_LIMIT = 100;

export async function listNotifications(filters: {
  tiket?: string;
  status_kirim?: string;
  limit: number;
  offset: number;
}): Promise<{ rows: NotificationRow[]; total: number }> {
  return listNotificationsRepo({
    ...filters,
    limit: Math.min(filters.limit, MAX_LIMIT),
  });
}

export async function retryNotification(
  notifId: string,
): Promise<{ id: string; status_kirim: string; percobaan: number } | null> {
  return retryNotifService(notifId);
}

export async function runContactRetention(): Promise<string[]> {
  const reports = await listNotificationsForRetention();
  const cleared: string[] = [];
  for (const report of reports) {
    await clearReportContact(report.tiket);
    cleared.push(report.tiket);
  }
  return cleared;
}
