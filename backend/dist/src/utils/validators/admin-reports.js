import { z } from 'zod';
import { LLM_TARGET_INSTITUTIONS } from '../../types/llm.js';
export const VerifyReportBodySchema = z
    .object({
    status: z.enum(['Diverifikasi', 'Ditolak', 'Diteruskan', 'Ditindaklanjuti', 'Selesai'], {
        error: 'status harus salah satu dari: Diverifikasi, Ditolak, Diteruskan, Ditindaklanjuti, Selesai',
    }),
    catatan_verifikator: z.string().trim().max(2000, {
        message: 'catatan_verifikator maksimal 2000 karakter',
    }).optional(),
    alasan_tolak: z.string().trim().max(2000, {
        message: 'alasan_tolak maksimal 2000 karakter',
    }).optional(),
})
    .refine((data) => data.status !== 'Ditolak' || (!!data.alasan_tolak && data.alasan_tolak.length > 0), { message: 'alasan_tolak wajib diisi saat menolak laporan', path: ['alasan_tolak'] });
export const ForwardBodySchema = z.object({
    lembaga: z.enum(LLM_TARGET_INSTITUTIONS, {
        error: `lembaga harus salah satu dari: ${LLM_TARGET_INSTITUTIONS.join(', ')}`,
    }),
});
