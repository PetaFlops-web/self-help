import { getPembayaranByProyekId, getProgresByProyekId, getRabItemsByProyekId, } from '../repositories/financials.js';
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
function computeRabItem(row) {
    const volume = toNum(row.volume);
    const hargaSatuan = toNum(row.harga_satuan);
    const hargaAcuan = toNum(row.harga_acuan);
    let total = null;
    if (volume !== null && hargaSatuan !== null) {
        total = Math.round(volume * hargaSatuan);
    }
    let deviasiPct = null;
    if (hargaSatuan !== null && hargaAcuan !== null && hargaAcuan !== 0) {
        deviasiPct = Math.round(((hargaSatuan - hargaAcuan) / hargaAcuan) * 100 * 100) / 100;
    }
    return {
        ...row,
        total: total !== null ? String(total) : null,
        deviasi_pct: deviasiPct !== null ? String(deviasiPct) : null,
    };
}
export async function getProjectRabItems(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id proyek harus UUID yang valid');
    }
    const proyek = await getProyekById(id);
    if (!proyek) {
        throw new HttpError(404, 'Proyek tidak ditemukan');
    }
    const rows = await getRabItemsByProyekId(id);
    const items = rows.map(computeRabItem);
    return { proyek_id: id, items };
}
