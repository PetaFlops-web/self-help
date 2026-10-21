import { Router } from 'express';
import { getProjectPayments, getProjectProgress, } from '../controllers/financials.js';
const router = Router();
router.get('/projects/:id/payments', getProjectPayments);
router.get('/projects/:id/progress', getProjectProgress);
export default router;
