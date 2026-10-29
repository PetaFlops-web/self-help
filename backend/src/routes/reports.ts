import { Router } from 'express';
import { createReport, getReportByTiket, listProjectReports } from '../controllers/reports.js';
import { reportLimiter } from '../middlewares/rate-limit.js';
import { uploadReportMedia, requireReportMedia } from '../middlewares/upload.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import { CreateReportBodySchema } from '../utils/validators/reports.js';
import { IdParamSchema } from '../utils/validators/common.js';

const router = Router();

router.post(
  '/reports',
  reportLimiter,
  uploadReportMedia,
  requireReportMedia,
  validateBody(CreateReportBodySchema),
  createReport,
);
router.get('/reports', getReportByTiket);
router.get('/projects/:id/reports', validateParams(IdParamSchema), listProjectReports);

export default router;
