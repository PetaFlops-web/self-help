import { Router } from 'express';
import { listAudit } from '../controllers/audit.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
const router = Router();
router.get('/admin/audit', requireAuth, requireRole('admin', 'peninjau'), listAudit);
export default router;
