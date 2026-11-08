import { z } from 'zod';
export const EtlRunBodySchema = z.object({
    source_id: z.string().min(1),
    csv_content: z.string().min(1, 'csv_content wajib diisi'),
    source_url: z
        .string()
        .url('source_url harus URL valid')
        .refine((value) => {
        try {
            const protocol = new URL(value).protocol;
            return protocol === 'https:' || protocol === 'http:';
        }
        catch {
            return false;
        }
    }, 'source_url harus menggunakan HTTP atau HTTPS'),
});
