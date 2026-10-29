import { z } from 'zod';
/** Schema param `:id` berupa UUID. Dipakai route mutasi yang menyasar resource. */
export const IdParamSchema = z.object({
    id: z.string({ error: 'id wajib diisi' }).uuid({ message: 'id harus UUID yang valid' }),
});
