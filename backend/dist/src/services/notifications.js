import { listNotifications as listNotificationsRepo, listNotificationsForRetention, clearReportContact, } from '../repositories/notification.js';
import { retryNotification as retryNotifService } from './notification/index.js';
const MAX_LIMIT = 100;
export async function listNotifications(filters) {
    return listNotificationsRepo({
        ...filters,
        limit: Math.min(filters.limit, MAX_LIMIT),
    });
}
export async function retryNotification(notifId) {
    return retryNotifService(notifId);
}
export async function runContactRetention() {
    const reports = await listNotificationsForRetention();
    const cleared = [];
    for (const report of reports) {
        await clearReportContact(report.tiket);
        cleared.push(report.tiket);
    }
    return cleared;
}
