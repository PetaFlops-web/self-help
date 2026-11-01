import { config } from '../config/env.js';
const MAX_ATTEMPTS = 1;
export class LlmServiceUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'LlmServiceUnavailableError';
    }
}
export async function callLlmService(payload) {
    const url = `${config.llmServiceUrl}/internal/generate`;
    const timeout = config.llmServiceTimeoutMs;
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(timeout),
            });
            if (res.ok) {
                return (await res.json());
            }
            const body = await res.text().catch(() => '');
            throw new Error(`llm-service HTTP ${res.status}: ${body.slice(0, 300)}`);
        }
        catch (err) {
            lastError = err;
        }
    }
    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new LlmServiceUnavailableError(`LLM service tidak tersedia: ${message}`);
}
