import { z } from 'zod';

/**
 * Schema body `POST /api/reports` (multipart/form-data).
 * Field inti wajib; lat/lng/anonim opsional. Nilai datang sebagai string dari
 * multipart sehingga lat/lng/anonim di-coerce. `foto_urls` tidak divalidasi di
 * sini karena diisi dari file hasil upload multer (lihat upload.ts).
 */
export const CreateReportBodySchema = z.object({
  proyek_id: z
    .string({ error: 'proyek_id wajib diisi' })
    .uuid({ message: 'proyek_id harus UUID yang valid' }),
  kategori: z
    .string({ error: 'kategori wajib diisi' })
    .trim()
    .min(1, { message: 'kategori wajib diisi' }),
  keterangan: z
    .string({ error: 'keterangan wajib diisi' })
    .trim()
    .min(1, { message: 'keterangan wajib diisi' })
    .max(4000, { message: 'keterangan maksimal 4000 karakter' }),
  lat: z.coerce
    .number({ error: 'lat harus berupa angka' })
    .min(-90, { message: 'lat harus antara -90 dan 90' })
    .max(90, { message: 'lat harus antara -90 dan 90' })
    .optional(),
  lng: z.coerce
    .number({ error: 'lng harus berupa angka' })
    .min(-180, { message: 'lng harus antara -180 dan 180' })
    .max(180, { message: 'lng harus antara -180 dan 180' })
    .optional(),
  anonim: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => v === true || v === 'true')
    .optional(),
});

export type CreateReportBody = z.infer<typeof CreateReportBodySchema>;
