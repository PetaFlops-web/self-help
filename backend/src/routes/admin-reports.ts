import { Router } from 'express';
import { verifyReport } from '../controllers/admin-reports.js';
import { validateBody } from '../middlewares/validate.js';
import { VerifyReportBodySchema } from '../utils/validators/admin-reports.js';

const router = Router();

router.patch('/admin/reports/:id', validateBody(VerifyReportBodySchema), verifyReport);

export default router;
