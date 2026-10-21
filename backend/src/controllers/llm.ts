import type { Request, Response } from 'express';
import { draftProject, explainProject } from '../services/llm-explanation.js';
import { HttpError } from '../helpers/http.js';
import { success } from '../middlewares/response.js';
import { LEMBAGA_TUJUAN, type LembagaTujuan } from '../types/llm.js';

export async function explain(req: Request<{ id: string }>, res: Response): Promise<void> {
  const result = await explainProject(req.params.id);
  success(res, 'penjelasan', result, 'Penjelasan proyek berhasil dibuat');
}

export async function draft(req: Request<{ id: string }>, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const raw = body.tujuan;

  let tujuan: LembagaTujuan = 'inspektorat';
  if (raw !== undefined) {
    if (typeof raw !== 'string' || !(LEMBAGA_TUJUAN as readonly string[]).includes(raw)) {
      throw new HttpError(400, `tujuan harus salah satu dari: ${LEMBAGA_TUJUAN.join(', ')}`);
    }
    tujuan = raw as LembagaTujuan;
  }

  const result = await draftProject(req.params.id, tujuan);
  success(res, 'draft', result, 'Draf laporan berhasil dibuat');
}
