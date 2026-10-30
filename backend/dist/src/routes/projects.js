import { Router } from 'express';
import { getProject, getProjectIndicators, listProjects, } from '../controllers/projects.js';
import { cache } from '../middlewares/cache.js';
const router = Router();
const projectsCache = cache({ namespace: 'projects', ttl: 300 });
router.get('/projects', projectsCache, listProjects);
router.get('/projects/:id', projectsCache, getProject);
router.get('/projects/:id/indicators', projectsCache, getProjectIndicators);
export default router;
