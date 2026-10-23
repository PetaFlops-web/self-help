import { getPaymentsByProjectId, getProgressByProjectId, getRabItemsByProjectId, } from '../repositories/financials.js';
import { getProjectById } from '../repositories/project.js';
import { HttpError, isUuid } from '../helpers/http.js';
import { toNum } from '../helpers/number.js';
export async function getProjectPayments(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id project harus UUID yang valid');
    }
    const project = await getProjectById(id);
    if (!project) {
        throw new HttpError(404, 'Project tidak ditemukan');
    }
    const payments = await getPaymentsByProjectId(id);
    const contractValue = toNum(project.nilai_kontrak) ?? 0;
    let totalDibayar = 0;
    let persenDibayar = 0;
    for (const p of payments) {
        const jumlah = toNum(p.jumlah);
        const persen = toNum(p.persen_kontrak);
        if (jumlah !== null)
            totalDibayar += jumlah;
        if (persen !== null)
            persenDibayar += persen;
    }
    const ringkasan = {
        proyek_id: id,
        nilai_kontrak: project.nilai_kontrak,
        total_dibayar: totalDibayar,
        persen_dibayar: persenDibayar,
        sisa_persen: Math.max(0, 100 - persenDibayar),
        termin_count: payments.length,
    };
    return { proyek_id: id, pembayaran: payments, ringkasan };
}
export async function getProjectProgress(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id project harus UUID yang valid');
    }
    const project = await getProjectById(id);
    if (!project) {
        throw new HttpError(404, 'Project tidak ditemukan');
    }
    const progress = await getProgressByProjectId(id);
    return { proyek_id: id, progres: progress };
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
        throw new HttpError(400, 'id project harus UUID yang valid');
    }
    const project = await getProjectById(id);
    if (!project) {
        throw new HttpError(404, 'Project tidak ditemukan');
    }
    const rows = await getRabItemsByProjectId(id);
    const items = rows.map(computeRabItem);
    return { proyek_id: id, items };
}
