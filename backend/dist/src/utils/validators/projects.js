import { z } from 'zod';
const CURRENT_YEAR = new Date().getFullYear();
/** Rentang wajar hps / nilai_kontrak terhadap pagu (SRS §9.2). */
export const RASIO_MIN = 0.2;
export const RASIO_MAX = 3.0;
const isoDate = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'format tanggal harus YYYY-MM-DD' })
    .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, { message: 'tanggal tidak valid' });
const tahunAnggaran = z.coerce
    .number({ error: 'tahun_anggaran harus angka' })
    .int()
    .min(2015, { message: 'tahun_anggaran minimal 2015' })
    .max(CURRENT_YEAR + 1, { message: `tahun_anggaran maksimal ${CURRENT_YEAR + 1}` });
const rupiah = (field) => z.coerce.number({ error: `${field} harus angka` }).int({ message: `${field} harus bilangan bulat` }).positive({ message: `${field} harus bilangan bulat positif` });
const optionalCode = z.string().trim().min(1).max(100);
// Field yang tidak dikenal (termasuk skor_total dan kategori) dibuang Zod —
// skor hanya ditulis recalculateProjectScore() (pengaman 3, AC-24).
export const CreateProjectBodySchema = z.object({
    nama: z.string({ error: 'nama wajib diisi' }).trim().min(1, { message: 'nama wajib diisi' }).max(500),
    dinas: z.string({ error: 'dinas wajib diisi' }).trim().min(1, { message: 'dinas wajib diisi' }).max(200),
    kode_bps: z.string({ error: 'kode_bps wajib diisi' }).trim().min(1, { message: 'kode_bps wajib diisi' }),
    tahun_anggaran: tahunAnggaran,
    pagu: rupiah('pagu'),
    kode_rup: optionalCode.optional(),
    kode_tender: optionalCode.optional(),
    hps: rupiah('hps').optional(),
    nilai_kontrak: rupiah('nilai_kontrak').optional(),
    sumber_dana: z.string().trim().max(100).optional(),
    metode_pemilihan: z.string().trim().max(100).optional(),
    pengumuman_rup_tgl: isoDate.optional(),
    status: z.string().trim().max(100).optional(),
});
// Rasio hps/nilai_kontrak terhadap pagu dicek di service terhadap nilai
// EFEKTIF (body digabung nilai tersimpan), karena PATCH sebagian bisa
// mengirim salah satu saja.
export const UpdateProjectBodySchema = z.object({
    nama: z.string().trim().min(1).max(500).optional(),
    dinas: z.string().trim().min(1).max(200).optional(),
    kode_bps: z.string().trim().min(1).optional(),
    tahun_anggaran: tahunAnggaran.optional(),
    pagu: rupiah('pagu').optional(),
    kode_rup: optionalCode.optional(),
    kode_tender: optionalCode.optional(),
    hps: rupiah('hps').optional(),
    nilai_kontrak: rupiah('nilai_kontrak').optional(),
    sumber_dana: z.string().trim().max(100).optional(),
    metode_pemilihan: z.string().trim().max(100).optional(),
    pengumuman_rup_tgl: isoDate.optional(),
    status: z.string().trim().max(100).optional(),
}).refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'minimal satu field harus diubah',
});
export const CreateTenderBodySchema = z.object({
    jumlah_penawar: z.coerce.number({ error: 'jumlah_penawar harus angka' }).int().min(0, { message: 'jumlah_penawar minimal 0' }),
    harga_penawaran_menang: rupiah('harga_penawaran_menang').optional(),
    tgl_pengumuman: isoDate.optional(),
    tgl_penetapan: isoDate.optional(),
});
export const UpdateTenderBodySchema = z.object({
    jumlah_penawar: z.coerce.number({ error: 'jumlah_penawar harus angka' }).int().min(0, { message: 'jumlah_penawar minimal 0' }).optional(),
    harga_penawaran_menang: rupiah('harga_penawaran_menang').optional(),
    tgl_pengumuman: isoDate.optional(),
    tgl_penetapan: isoDate.optional(),
}).refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'minimal satu field harus diubah',
});
