import type { Request, Response } from 'express';
import { ok } from '../middlewares/response.js';
import * as documentsService from '../services/documents.js';

export async function getProjectDocuments(req: Request<{ id: string }>, res: Response): Promise<void> {
  const id = req.params.id;
  const result = await documentsService.getProjectDocuments(id);
  ok(res, 'documents', result);
}

export async function getProjectProcedureChecklist(req: Request<{ id: string }>, res: Response): Promise<void> {
  const id = req.params.id;
  const result = await documentsService.getProjectProcedureChecklist(id);
  ok(res, 'procedure_checklist', result);
}
