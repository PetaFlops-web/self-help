import { Router } from 'express';
import {
  listNotificationsHandler,
  retryNotificationHandler,
  retentionHandler,
} from '../controllers/notifications.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get(
  '/admin/notifications',
  requireAuth,
  requireRole('admin', 'peninjau'),
  listNotificationsHandler,
);
router.post(
  '/admin/notifications/:id/retry',
  requireAuth,
  requireRole('admin'),
  retryNotificationHandler,
);
router.post(
  '/admin/notifications/retention',
  requireAuth,
  requireRole('admin'),
  retentionHandler,
);

export default router;
