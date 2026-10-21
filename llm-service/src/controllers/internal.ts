import type { Request, Response } from 'express';
import { GenerateInputSchema, type LlmGenerateRequest } from '../types/llm.js';
import { generateExplanation, generateDraft } from '../services/llm.js';
import { ProviderError, ValidationError } from '../services/validation.js';

export async function generate(req: Request, res: Response): Promise<void> {
  const body = req.body;

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ success: false, message: 'Body harus berupa objek JSON' });
    return;
  }

  const parsed = GenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Body JSON tidak valid',
      detail: parsed.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`),
    });
    return;
  }

  const input = parsed.data as LlmGenerateRequest;
  console.log(`[llm-service] POST /internal/generate diterima: ${JSON.stringify(input)}`);

  const indikator = input.indikator ?? [];
  if (indikator.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Payload tidak lengkap: indikator wajib diisi (minimal satu kode_aturan)',
    });
    return;
  }

  try {
    const tugas = input.tugas ?? 'explain';
    const output =
      tugas === 'draft' ? await generateDraft(input) : await generateExplanation(input);
    res.status(200).json(output);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(422).json({ success: false, message: err.message });
      return;
    }
    if (err instanceof ProviderError) {
      res.status(503).json({ success: false, message: err.message });
      return;
    }
    console.error('[llm-service] unexpected error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
