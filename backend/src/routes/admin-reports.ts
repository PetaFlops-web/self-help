import { Router } from 'express';
import {
  listReports,
  getReportDetail,
  verifyReport,
  forwardReport,
} from '../controllers/admin-reports.js';
import { validateBody } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { VerifyReportBodySchema, ForwardBodySchema } from '../utils/validators/admin-reports.js';

const router = Router();

router.get(
  '/admin/reports',
  requireAuth,
  requireRole('admin', 'verifikator'),
  listReports,
);

router.get(
  '/admin/reports/:tiket',
  requireAuth,
  requireRole('admin', 'verifikator'),
  getReportDetail,
);

router.patch(
  '/admin/reports/:id',
  requireAuth,
  requireRole('admin', 'verifikator'),
  validateBody(VerifyReportBodySchema),
  verifyReport,
);

router.post(
  '/admin/reports/:tiket/forward',
  requireAuth,
  requireRole('admin', 'verifikator'),
  validateBody(ForwardBodySchema),
  forwardReport,
);

export default router;
