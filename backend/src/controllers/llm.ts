import type { Request, Response } from 'express';
import { draftProject, explainProject } from '../services/llm-explanation.js';
import { HttpError } from '../helpers/http.js';
import { success } from '../middlewares/response.js';
import { LLM_TARGET_INSTITUTIONS, type LlmTargetInstitution } from '../types/llm.js';

export async function explain(req: Request<{ id: string }>, res: Response): Promise<void> {
  const result = await explainProject(req.params.id);
  success(res, 'penjelasan', result, 'Penjelasan proyek berhasil dibuat');
}

export async function draft(req: Request<{ id: string }>, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const raw = body.tujuan;

  let tujuan: LlmTargetInstitution = 'inspektorat';
  if (raw !== undefined) {
    if (typeof raw !== 'string' || !(LLM_TARGET_INSTITUTIONS as readonly string[]).includes(raw)) {
      throw new HttpError(400, `tujuan harus salah satu dari: ${LLM_TARGET_INSTITUTIONS.join(', ')}`);
    }
    tujuan = raw as LlmTargetInstitution;
  }

  const result = await draftProject(req.params.id, tujuan);
  success(res, 'draft', result, 'Draf laporan berhasil dibuat');
}
