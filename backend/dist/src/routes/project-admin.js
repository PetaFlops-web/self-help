import { Router } from 'express';
import { createProjectHandler, updateProjectHandler, deleteProjectHandler, createTenderHandler, updateTenderHandler, deleteTenderHandler, valueHistoryHandler, getProjectTendersHandler, } from '../controllers/project-admin.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import { IdParamSchema } from '../utils/validators/common.js';
import { CreateProjectBodySchema, UpdateProjectBodySchema, CreateTenderBodySchema, UpdateTenderBodySchema, } from '../utils/validators/projects.js';
const router = Router();
// Project CRUD — admin only
router.post('/admin/projects', requireAuth, requireRole('admin'), validateBody(CreateProjectBodySchema), createProjectHandler);
router.patch('/admin/projects/:id', requireAuth, requireRole('admin'), validateParams(IdParamSchema), validateBody(UpdateProjectBodySchema), updateProjectHandler);
router.put('/admin/projects/:id', requireAuth, requireRole('admin'), validateParams(IdParamSchema), validateBody(UpdateProjectBodySchema), updateProjectHandler);
router.delete('/admin/projects/:id', requireAuth, requireRole('admin'), validateParams(IdParamSchema), deleteProjectHandler);
// Value history — admin + peninjau
router.get('/admin/projects/:id/value-history', requireAuth, requireRole('admin', 'peninjau'), validateParams(IdParamSchema), valueHistoryHandler);
// Tender CRUD — admin only
router.get('/admin/projects/:id/tenders', requireAuth, requireRole('admin', 'peninjau'), validateParams(IdParamSchema), getProjectTendersHandler);
router.post('/admin/projects/:id/tenders', requireAuth, requireRole('admin'), validateParams(IdParamSchema), validateBody(CreateTenderBodySchema), createTenderHandler);
router.patch('/admin/tenders/:id', requireAuth, requireRole('admin'), validateBody(UpdateTenderBodySchema), updateTenderHandler);
router.put('/admin/tenders/:id', requireAuth, requireRole('admin'), validateBody(UpdateTenderBodySchema), updateTenderHandler);
router.delete('/admin/tenders/:id', requireAuth, requireRole('admin'), deleteTenderHandler);
export default router;
