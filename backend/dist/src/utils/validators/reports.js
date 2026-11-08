import { z } from 'zod';
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
    ukuran_lapangan: z.coerce
        .number({ error: 'ukuran_lapangan harus berupa angka' })
        .min(0, { message: 'ukuran_lapangan tidak boleh negatif' })
        .optional(),
    nama_pelapor: z
        .string({ error: 'nama_pelapor harus teks' })
        .trim()
        .max(200, { message: 'nama_pelapor maksimal 200 karakter' })
        .optional(),
    // Wajib: satu-satunya kanal notifikasi status laporan (FR-54 rev 8 Nov 2026).
    surel_pelapor: z
        .string({ error: 'surel_pelapor wajib diisi' })
        .trim()
        .toLowerCase()
        .min(1, { message: 'surel_pelapor wajib diisi' })
        .email({ message: 'Format surel_pelapor tidak valid' }),
    telepon_pelapor: z
        .string({ error: 'telepon_pelapor harus teks' })
        .trim()
        .max(20, { message: 'telepon_pelapor maksimal 20 karakter' })
        .optional(),
});
