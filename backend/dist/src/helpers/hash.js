import { createHash } from 'node:crypto';
/**
 * SHA-256 hex dari sebuah objek, dipakai sebagai `input_hash` cache LLM
 * (LLM-07). Payload yang identik menghasilkan hash identik; perubahan pada
 * data proyek, skor, indikator, atau versi_prompt mengubah hash.
 */
export function hashObject(obj) {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}
