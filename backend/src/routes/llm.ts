import { Router } from 'express';
import { explain, draft } from '../controllers/llm.js';
import { llmLimiter } from '../middlewares/rate-limit.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import { IdParamSchema } from '../utils/validators/common.js';
import { DraftBodySchema } from '../utils/validators/llm.js';

const router = Router();

router.post('/projects/:id/explain', llmLimiter, validateParams(IdParamSchema), explain);
router.post(
  '/projects/:id/draft',
  llmLimiter,
  validateParams(IdParamSchema),
  validateBody(DraftBodySchema),
  draft,
);

export default router;
