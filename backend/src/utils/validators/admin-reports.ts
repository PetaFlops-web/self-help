import { z } from 'zod';

/**
 * Schema body `PATCH /api/admin/reports/:id`.
 * `status` wajib (enum); `alasan_tolak` wajib jika status 'Ditolak'.
 */
export const VerifyReportBodySchema = z
  .object({
    status: z.enum(['Diverifikasi', 'Ditolak'], {
      error: 'status harus Diverifikasi atau Ditolak',
    }),
    catatan_verifikator: z.string().trim().max(2000, {
      message: 'catatan_verifikator maksimal 2000 karakter',
    }).optional(),
    alasan_tolak: z.string().trim().max(2000, {
      message: 'alasan_tolak maksimal 2000 karakter',
    }).optional(),
  })
  .refine(
    (data) => data.status !== 'Ditolak' || (!!data.alasan_tolak && data.alasan_tolak.length > 0),
    { message: 'alasan_tolak wajib diisi saat menolak laporan', path: ['alasan_tolak'] },
  );

export type VerifyReportBody = z.infer<typeof VerifyReportBodySchema>;
