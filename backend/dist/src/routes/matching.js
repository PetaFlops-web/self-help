import { Router } from 'express';
import { listUnmatched, matchDecision } from '../controllers/matching.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { MatchDecisionSchema } from '../utils/validators/matching.js';
const router = Router();
router.get('/admin/etl/unmatched', requireAuth, requireRole('admin'), listUnmatched);
router.post('/admin/etl/match', requireAuth, requireRole('admin'), validateBody(MatchDecisionSchema), matchDecision);
export default router;
