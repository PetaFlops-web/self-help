import { Router } from 'express';
import { createReport, getReportByTiket } from '../controllers/reports.js';
import { reportLimiter } from '../middlewares/rate-limit.js';

const router = Router();

router.post('/reports', reportLimiter, createReport);
router.get('/reports', getReportByTiket);

export default router;
