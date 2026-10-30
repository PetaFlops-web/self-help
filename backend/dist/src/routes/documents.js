import { Router } from 'express';
import { getProjectDocuments, getProjectProcedureChecklist, } from '../controllers/documents.js';
import { cache } from '../middlewares/cache.js';
const router = Router();
const projectsCache = cache({ namespace: 'projects', ttl: 300 });
router.get('/projects/:id/documents', projectsCache, getProjectDocuments);
router.get('/projects/:id/procedure-checklist', projectsCache, getProjectProcedureChecklist);
export default router;
