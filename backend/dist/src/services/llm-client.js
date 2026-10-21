const DEFAULT_URL = 'http://localhost:3001';
// Cukup longgar untuk menampung retry internal llm-service (10 detik + 1 retry, LLM-06).
const DEFAULT_TIMEOUT_MS = 30000;
// Retry 10 detik + 1 percobaan ulang dilakukan di llm-service; backend cukup sekali panggil.
const DEFAULT_MAX_ATTEMPTS = 1;
export class LlmServiceUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'LlmServiceUnavailableError';
    }
}
function baseUrl() {
    return (process.env.LLM_SERVICE_URL || DEFAULT_URL).replace(/\/+$/, '');
}
function timeoutMs() {
    const n = Number(process.env.LLM_SERVICE_TIMEOUT_MS);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}
/**
 * Panggil llm-service dari server saja (LLM-01); kunci API hanya ada di
 * llm-service. Batas waktu 10 detik + satu retry (LLM-06).
 */
export async function callLlmService(payload) {
    const url = `${baseUrl()}/internal/generate`;
    const timeout = timeoutMs();
    let lastError = null;
    for (let attempt = 1; attempt <= DEFAULT_MAX_ATTEMPTS; attempt++) {
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
