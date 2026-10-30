import { Router } from 'express';
import { getScoringConfig } from '../controllers/config.js';
import { cache } from '../middlewares/cache.js';
const router = Router();
router.get('/config/scoring', cache({ namespace: 'meta', ttl: 3600 }), getScoringConfig);
export default router;
