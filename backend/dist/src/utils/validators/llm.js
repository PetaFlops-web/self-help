import { z } from 'zod';
import { LLM_TARGET_INSTITUTIONS } from '../../types/llm.js';
/**
 * Schema body `POST /api/projects/:id/draft`.
 * `tujuan` enum lembaga tujuan laporan; default 'inspektorat' bila tidak dikirim.
 */
export const DraftBodySchema = z.object({
    tujuan: z
        .enum(LLM_TARGET_INSTITUTIONS, {
        error: `tujuan harus salah satu dari: ${LLM_TARGET_INSTITUTIONS.join(', ')}`,
    })
        .default('inspektorat'),
});
