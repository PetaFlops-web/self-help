import { Router } from 'express';
import {
  getProject,
  getProjectIndicators,
  listProjects,
} from '../controllers/projects.js';

const router = Router();

router.get('/projects', listProjects);
router.get('/projects/:id', getProject);
router.get('/projects/:id/indicators', getProjectIndicators);

export default router;