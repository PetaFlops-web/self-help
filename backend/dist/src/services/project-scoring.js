import { loadScoringConfig } from '../config/scoring.js';
import { scoreProject } from './scoring.js';
import { toNum } from '../helpers/number.js';
import { deleteIndicatorFindingsByProjectId, getUnpublishedDocumentSummary, getVerifiedReportCount, getPaymentDisbursedPercentage, getPhysicalProgressPercentage, getUnfulfilledProcedureSummary, getProjectRow, getRabTotalReference, getTenderRow, insertIndicatorFinding, updateProjectScore, } from '../repositories/project-scoring.js';
export async function collectScoreInput(client, projectId) {
    const projectRow = await getProjectRow(client, projectId);
    const tender = await getTenderRow(client, projectId);
    const disbursedPctRaw = await getPaymentDisbursedPercentage(client, projectId);
    const physicalPctRaw = await getPhysicalProgressPercentage(client, projectId);
    const reportCountRaw = await getVerifiedReportCount(client, projectId);
    const referenceTotalRaw = await getRabTotalReference(client, projectId);
    const documentSummary = await getUnpublishedDocumentSummary(client, projectId);
    const procedureSummary = await getUnfulfilledProcedureSummary(client, projectId);
    const hps = toNum(projectRow?.hps);
    const nilaiKontrak = toNum(projectRow?.nilai_kontrak);
    const winningBid = toNum(tender?.harga_penawaran_menang);
    const referenceTotal = toNum(referenceTotalRaw);
    const disbursedPct = toNum(disbursedPctRaw);
    const physicalPct = toNum(physicalPctRaw);
    const input = {};
    input.jumlah_penawar = toNum(tender?.jumlah_penawar);
    input.hari_rup_ke_tender = toNum(tender?.hari_rup_ke_tender);
    input.jumlah_laporan_terverifikasi = toNum(reportCountRaw);
    if (documentSummary.wajib > 0) {
        input.persen_dokumen_belum_publik = Math.round((documentSummary.belum_publik / documentSummary.wajib) * 100);
    }
    if (procedureSummary.total > 0) {
        input.persen_prosedur_tidak_terpenuhi = Math.round((procedureSummary.tidak_terpenuhi / procedureSummary.total) * 100);
    }
    if (hps !== null && winningBid !== null) {
        input.menang_hps_pct = Math.round((winningBid / hps) * 100);
    }
    if (referenceTotal !== null && referenceTotal > 0) {
        if (nilaiKontrak !== null) {
            input.selisih_harga_acuan_pct = Math.round(((nilaiKontrak - referenceTotal) / referenceTotal) * 100);
        }
        if (hps !== null) {
            input.selisih_hps_acuan_pct = Math.round(((hps - referenceTotal) / referenceTotal) * 100);
        }
    }
    if (disbursedPct !== null && physicalPct !== null) {
        input.cair_minus_fisik_poin = Math.round(disbursedPct - physicalPct);
    }
    return input;
}
export async function recalculateProjectScore(pool, projectId) {
    const config = loadScoringConfig();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const input = await collectScoreInput(client, projectId);
        const result = scoreProject(input, config);
        await updateProjectScore(client, projectId, result.skor_total, result.kategori);
        await deleteIndicatorFindingsByProjectId(client, projectId);
        for (const f of result.indikator_temuan) {
            await insertIndicatorFinding(client, projectId, f);
        }
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
