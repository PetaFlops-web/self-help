import { z } from 'zod';
export const LoginBodySchema = z.object({
    surel: z
        .string()
        .trim()
        .min(1, { message: 'surel wajib diisi' })
        .email({ message: 'format surel tidak valid' }),
    kata_sandi: z
        .string()
        .min(1, { message: 'kata_sandi wajib diisi' }),
});
