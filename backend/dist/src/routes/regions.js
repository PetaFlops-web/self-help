import { Router } from 'express';
import { getRegions } from '../controllers/regions.js';
import { cache } from '../middlewares/cache.js';
const router = Router();
router.get('/regions', cache({ namespace: 'meta', ttl: 3600 }), getRegions);
export default router;
