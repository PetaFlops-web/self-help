import { Router } from 'express';
import { listSources } from '../controllers/sources.js';
import { cache } from '../middlewares/cache.js';

const router = Router();

router.get('/sources', cache({ namespace: 'meta', ttl: 3600 }), listSources);

export default router;
