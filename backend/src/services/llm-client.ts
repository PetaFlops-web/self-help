import type { LlmGeneratePayload, LlmOutput } from '../types/llm.js';
import { config } from '../config/env.js';

// Retry 10 detik + 1 percobaan ulang dilakukan di llm-service; backend cukup sekali panggil.
const MAX_ATTEMPTS = 1;

export class LlmServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmServiceUnavailableError';
  }
}

/**
 * Panggil llm-service dari server saja (LLM-01); kunci API hanya ada di
 * llm-service. Batas waktu 10 detik + satu retry (LLM-06).
 */
export async function callLlmService(payload: LlmGeneratePayload): Promise<LlmOutput> {
  const url = `${config.llmServiceUrl}/internal/generate`;
  const timeout = config.llmServiceTimeoutMs;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeout),
      });

      if (res.ok) {
        return (await res.json()) as LlmOutput;
      }

      const body = await res.text().catch(() => '');
      throw new Error(`llm-service HTTP ${res.status}: ${body.slice(0, 300)}`);
    } catch (err) {
      lastError = err;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new LlmServiceUnavailableError(`LLM service tidak tersedia: ${message}`);
}
