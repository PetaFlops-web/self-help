import type { LlmConfig } from '../../config/env.js';
import type { Prompt } from '../prompt.js';
import type { LlmGenerateRequest } from '../../types/llm.js';
import { ProviderError } from '../validation.js';
import { callOpenAi } from './openai.js';
import { callGemini } from './gemini.js';
import { callMock } from './mock.js';

export type ProviderFn = (
  config: LlmConfig,
  prompt: Prompt,
  req: LlmGenerateRequest,
) => Promise<string>;

export async function callProvider(
  config: LlmConfig,
  prompt: Prompt,
  req: LlmGenerateRequest,
): Promise<string> {
  if (config.provider === 'mock') {
    return callMock(config, prompt, req);
  }

  if (!config.apiKey) {
    throw new ProviderError(`AI_API_KEY kosong; provider "${config.provider}" tidak dapat dipanggil`);
  }

  try {
    if (config.provider === 'openai') return await callOpenAi(config, prompt);
    return await callGemini(config, prompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ProviderError(`Gagal memanggil ${config.provider}: ${message}`);
  }
}
