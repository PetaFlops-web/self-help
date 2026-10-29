import type { Request, Response } from 'express';
import { draftProject, explainProject } from '../services/llm-explanation.js';
import { success } from '../middlewares/response.js';
import { type LlmTargetInstitution } from '../types/llm.js';

export async function explain(req: Request<{ id: string }>, res: Response): Promise<void> {
  const result = await explainProject(req.params.id);
  success(res, 'penjelasan', result, 'Penjelasan proyek berhasil dibuat');
}

export async function draft(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { tujuan } = req.body as { tujuan: LlmTargetInstitution };
  const result = await draftProject(req.params.id, tujuan);
  success(res, 'draft', result, 'Draf laporan berhasil dibuat');
}
