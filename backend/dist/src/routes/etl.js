import { Router } from 'express';
import { runEtlHandler, listEtlErrors } from '../controllers/etl.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { EtlRunBodySchema } from '../utils/validators/etl.js';
const router = Router();
router.post('/admin/etl/run', requireAuth, requireRole('admin'), validateBody(EtlRunBodySchema), runEtlHandler);
router.get('/admin/etl/errors', requireAuth, requireRole('admin'), listEtlErrors);
export default router;
