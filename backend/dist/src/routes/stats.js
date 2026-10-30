import { Router } from 'express';
import { getStats } from '../controllers/stats.js';
import { cache } from '../middlewares/cache.js';
const router = Router();
router.get('/stats', cache({ namespace: 'stats', ttl: 300 }), getStats);
export default router;
