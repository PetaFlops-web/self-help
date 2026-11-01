import { z } from 'zod';

export const IdParamSchema = z.object({
  id: z.string({ error: 'id wajib diisi' }).uuid({ message: 'id harus UUID yang valid' }),
});

export type IdParam = z.infer<typeof IdParamSchema>;
