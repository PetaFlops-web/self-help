import { Router } from 'express';
import { verifyReport } from '../controllers/admin-reports.js';
const router = Router();
router.patch('/admin/reports/:id', verifyReport);
export default router;
