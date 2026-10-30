import { Router } from 'express';
import {
  getProjectPayments,
  getProjectProgress,
  getProjectRabItems,
} from '../controllers/financials.js';
import { cache } from '../middlewares/cache.js';

const router = Router();

const projectsCache = cache({ namespace: 'projects', ttl: 300 });

router.get('/projects/:id/payments', projectsCache, getProjectPayments);
router.get('/projects/:id/progress', projectsCache, getProjectProgress);
router.get('/projects/:id/rab-items', projectsCache, getProjectRabItems);

export default router;
