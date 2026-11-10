import { z } from 'zod';
const isoDate = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'format tanggal harus YYYY-MM-DD' })
    .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, { message: 'tanggal tidak valid' });
export const CreateRabItemSchema = z.object({
    uraian: z.string({ error: 'uraian wajib diisi' }).trim().min(3, { message: 'uraian minimal 3 karakter' }).max(255, { message: 'uraian maksimal 255 karakter' }),
    satuan: z.string({ error: 'satuan wajib diisi' }).trim().min(1, { message: 'satuan wajib diisi' }).max(50, { message: 'satuan maksimal 50 karakter' }),
    volume: z.coerce.number({ error: 'volume harus angka' }).positive({ message: 'volume harus angka positif' }),
    harga_satuan: z.coerce.number({ error: 'harga_satuan harus angka' }).int({ message: 'harga_satuan harus bilangan bulat' }).positive({ message: 'harga_satuan harus bilangan bulat positif' }),
    kode_harga_acuan: z.string().trim().min(1).max(100).nullable().optional(),
});
export const UpdateRabItemSchema = z.object({
    uraian: z.string().trim().min(3, { message: 'uraian minimal 3 karakter' }).max(255, { message: 'uraian maksimal 255 karakter' }).optional(),
    satuan: z.string().trim().min(1, { message: 'satuan wajib diisi' }).max(50, { message: 'satuan maksimal 50 karakter' }).optional(),
    volume: z.coerce.number({ error: 'volume harus angka' }).positive({ message: 'volume harus angka positif' }).optional(),
    harga_satuan: z.coerce.number({ error: 'harga_satuan harus angka' }).int({ message: 'harga_satuan harus bilangan bulat' }).positive({ message: 'harga_satuan harus bilangan bulat positif' }).optional(),
    kode_harga_acuan: z.string().trim().min(1).max(100).nullable().optional(),
});
export const CreatePaymentSchema = z.object({
    termin_ke: z.coerce.number({ error: 'termin_ke harus angka' }).int({ message: 'termin_ke harus bilangan bulat' }).min(1, { message: 'termin_ke minimal 1' }).max(20, { message: 'termin_ke maksimal 20' }),
    tanggal: isoDate,
    jumlah: z.coerce.number({ error: 'jumlah harus angka' }).int({ message: 'jumlah harus bilangan bulat' }).positive({ message: 'jumlah harus bilangan bulat positif' }),
    persen_kontrak: z.coerce.number({ error: 'persen_kontrak harus angka' }).min(0.01, { message: 'persen_kontrak minimal 0.01' }).max(100, { message: 'persen_kontrak maksimal 100' }),
});
export const UpdatePaymentSchema = z.object({
    termin_ke: z.coerce.number({ error: 'termin_ke harus angka' }).int({ message: 'termin_ke harus bilangan bulat' }).min(1, { message: 'termin_ke minimal 1' }).max(20, { message: 'termin_ke maksimal 20' }).optional(),
    tanggal: isoDate.optional(),
    jumlah: z.coerce.number({ error: 'jumlah harus angka' }).int({ message: 'jumlah harus bilangan bulat' }).positive({ message: 'jumlah harus bilangan bulat positif' }).optional(),
    persen_kontrak: z.coerce.number({ error: 'persen_kontrak harus angka' }).min(0.01, { message: 'persen_kontrak minimal 0.01' }).max(100, { message: 'persen_kontrak maksimal 100' }).optional(),
});
export const CreateProgressSchema = z.object({
    tanggal: isoDate,
    persen_fisik: z.coerce.number({ error: 'persen_fisik harus angka' }).min(0, { message: 'persen_fisik minimal 0' }).max(100, { message: 'persen_fisik maksimal 100' }),
});
export const UpdateProgressSchema = z.object({
    tanggal: isoDate.optional(),
    persen_fisik: z.coerce.number({ error: 'persen_fisik harus angka' }).min(0, { message: 'persen_fisik minimal 0' }).max(100, { message: 'persen_fisik maksimal 100' }).optional(),
});
