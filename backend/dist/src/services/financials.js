import { getPembayaranByProyekId, getProgresByProyekId, } from '../repositories/financials.js';
import { getProyekById } from '../repositories/proyek.js';
import { HttpError, isUuid } from '../helpers/http.js';
import { toNum } from '../helpers/number.js';
export async function getProjectPayments(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id proyek harus UUID yang valid');
    }
    const proyek = await getProyekById(id);
    if (!proyek) {
        throw new HttpError(404, 'Proyek tidak ditemukan');
    }
    const pembayaran = await getPembayaranByProyekId(id);
    const nilaiKontrak = toNum(proyek.nilai_kontrak) ?? 0;
    let totalDibayar = 0;
    let persenDibayar = 0;
    for (const p of pembayaran) {
        const jumlah = toNum(p.jumlah);
        const persen = toNum(p.persen_kontrak);
        if (jumlah !== null)
            totalDibayar += jumlah;
        if (persen !== null)
            persenDibayar += persen;
    }
    const ringkasan = {
        proyek_id: id,
        nilai_kontrak: proyek.nilai_kontrak,
        total_dibayar: totalDibayar,
        persen_dibayar: persenDibayar,
        sisa_persen: Math.max(0, 100 - persenDibayar),
        termin_count: pembayaran.length,
    };
    return { proyek_id: id, pembayaran, ringkasan };
}
export async function getProjectProgress(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id proyek harus UUID yang valid');
    }
    const proyek = await getProyekById(id);
    if (!proyek) {
        throw new HttpError(404, 'Proyek tidak ditemukan');
    }
    const progres = await getProgresByProyekId(id);
    return { proyek_id: id, progres };
}
