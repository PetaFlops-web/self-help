import { Router } from 'express';
import { createReport, getReportByTiket } from '../controllers/reports.js';
const router = Router();
router.post('/reports', createReport);
router.get('/reports', getReportByTiket);
export default router;
