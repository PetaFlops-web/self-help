import { Router } from 'express';
import {
  createRabItemHandler,
  updateRabItemHandler,
  deleteRabItemHandler,
  createPaymentHandler,
  updatePaymentHandler,
  deletePaymentHandler,
  createProgressHandler,
  updateProgressHandler,
  deleteProgressHandler,
} from '../controllers/project-execution.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import { IdParamSchema } from '../utils/validators/common.js';
import {
  CreateRabItemSchema,
  UpdateRabItemSchema,
  CreatePaymentSchema,
  UpdatePaymentSchema,
  CreateProgressSchema,
  UpdateProgressSchema,
} from '../utils/validators/project-execution.js';

const router = Router();

router.post(
  '/admin/projects/:id/rab-items',
  requireAuth,
  requireRole('admin'),
  validateParams(IdParamSchema),
  validateBody(CreateRabItemSchema),
  createRabItemHandler,
);

router.patch(
  '/admin/rab-items/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(IdParamSchema),
  validateBody(UpdateRabItemSchema),
  updateRabItemHandler,
);

router.delete(
  '/admin/rab-items/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(IdParamSchema),
  deleteRabItemHandler,
);

router.post(
  '/admin/projects/:id/payments',
  requireAuth,
  requireRole('admin'),
  validateParams(IdParamSchema),
  validateBody(CreatePaymentSchema),
  createPaymentHandler,
);

router.patch(
  '/admin/payments/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(IdParamSchema),
  validateBody(UpdatePaymentSchema),
  updatePaymentHandler,
);

router.delete(
  '/admin/payments/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(IdParamSchema),
  deletePaymentHandler,
);

router.post(
  '/admin/projects/:id/progress',
  requireAuth,
  requireRole('admin'),
  validateParams(IdParamSchema),
  validateBody(CreateProgressSchema),
  createProgressHandler,
);

router.patch(
  '/admin/progress/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(IdParamSchema),
  validateBody(UpdateProgressSchema),
  updateProgressHandler,
);

router.delete(
  '/admin/progress/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(IdParamSchema),
  deleteProgressHandler,
);

export default router;
