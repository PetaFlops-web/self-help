import { loadLlmConfig } from '../config/env.js';
import type { LlmGenerateRequest, LlmOutput, DraftOutput } from '../types/llm.js';
import { buildPrompt, buildDraftPrompt } from './prompt.js';
import { callProvider } from './providers/index.js';
import {
  checkForbiddenPhrases,
  collectNumbers,
  validateOutput,
  validateDraftOutput,
  ValidationError,
} from './validation.js';

const MAX_ATTEMPTS = 2; 

type Tugas = 'explain' | 'draft';

function collectAllowedCodes(req: LlmGenerateRequest): Set<string> {
  return new Set(
    (req.indikator ?? [])
      .map((i) => i.kode_aturan)
      .filter((c): c is string => typeof c === 'string' && c.length > 0),
  );
}

async function generate(req: LlmGenerateRequest, tugas: Tugas): Promise<LlmOutput | DraftOutput> {
  const config = loadLlmConfig();
  const prompt = tugas === 'draft' ? buildDraftPrompt(req) : buildPrompt(req);

  const allowedCodes = collectAllowedCodes(req);
  const allowedNumbers = collectNumbers(req);

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callProvider(config, prompt, req);
      console.log(`[llm-service] respon API LLM (${config.provider}, tugas=${tugas}, percobaan ${attempt}):`);
      console.log(raw);

      const output =
        tugas === 'draft'
          ? validateDraftOutput(raw, { allowedCodes, allowedNumbers })
          : validateOutput(raw, { allowedCodes, allowedNumbers });
      checkForbiddenPhrases(output);
      return output;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[llm-service] percobaan ${attempt} (tugas=${tugas}) gagal: ${message}`);
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new ValidationError('Gagal menghasilkan keluaran LLM yang valid');
}

export async function generateExplanation(req: LlmGenerateRequest): Promise<LlmOutput> {
  return (await generate(req, 'explain')) as LlmOutput;
}

export async function generateDraft(req: LlmGenerateRequest): Promise<DraftOutput> {
  return (await generate(req, 'draft')) as DraftOutput;
}
