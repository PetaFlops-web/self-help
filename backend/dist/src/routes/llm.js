import { Router } from 'express';
import { explain, draft } from '../controllers/llm.js';
const router = Router();
router.post('/projects/:id/explain', explain);
router.post('/projects/:id/draft', draft);
export default router;
