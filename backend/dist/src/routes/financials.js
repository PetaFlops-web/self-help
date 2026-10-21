import { Router } from 'express';
import { getProjectPayments, getProjectProgress, getProjectRabItems, } from '../controllers/financials.js';
const router = Router();
router.get('/projects/:id/payments', getProjectPayments);
router.get('/projects/:id/progress', getProjectProgress);
router.get('/projects/:id/rab-items', getProjectRabItems);
export default router;
