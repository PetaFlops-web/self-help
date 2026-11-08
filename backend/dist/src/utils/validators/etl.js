import { z } from 'zod';
export const EtlRunBodySchema = z.object({
    source_id: z.string().min(1),
    csv_content: z.string().optional(),
});
