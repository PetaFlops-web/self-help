import { Router } from 'express';
import { explain, draft } from '../controllers/llm.js';
import { llmLimiter } from '../middlewares/rate-limit.js';

const router = Router();

router.post('/projects/:id/explain', llmLimiter, explain);
router.post('/projects/:id/draft', llmLimiter, draft);

export default router;
