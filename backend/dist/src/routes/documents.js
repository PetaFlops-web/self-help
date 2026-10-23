import { Router } from 'express';
import { getProjectDocuments, getProjectProcedureChecklist, } from '../controllers/documents.js';
const router = Router();
router.get('/projects/:id/documents', getProjectDocuments);
router.get('/projects/:id/procedure-checklist', getProjectProcedureChecklist);
export default router;
