import { loadScoringConfig } from '../config/scoring.js';
import { scoreProject } from './scoring.js';
import { toNum } from '../helpers/number.js';
import { deleteIndikatorTemuan, getLaporanTerverifikasiCount, getPembayaranCair, getProgresFisik, getProyekRow, getRabTotalAcuan, getTenderRow, insertIndikatorTemuan, updateProyekScore, } from '../repositories/project-scoring.js';
export async function collectScoreInput(client, proyekId) {
    const proyek = await getProyekRow(client, proyekId);
    const tender = await getTenderRow(client, proyekId);
    const persenCairRaw = await getPembayaranCair(client, proyekId);
    const persenFisikRaw = await getProgresFisik(client, proyekId);
    const laporanCountRaw = await getLaporanTerverifikasiCount(client, proyekId);
    const totalAcuanRaw = await getRabTotalAcuan(client, proyekId);
    const hps = toNum(proyek?.hps);
    const nilaiKontrak = toNum(proyek?.nilai_kontrak);
    const hargaMenang = toNum(tender?.harga_penawaran_menang);
    const totalAcuan = toNum(totalAcuanRaw);
    const persenCair = toNum(persenCairRaw);
    const persenFisik = toNum(persenFisikRaw);
    const input = {};
    input.jumlah_penawar = toNum(tender?.jumlah_penawar);
    input.hari_rup_ke_tender = toNum(tender?.hari_rup_ke_tender);
    input.jumlah_laporan_terverifikasi = toNum(laporanCountRaw);
    if (hps !== null && hargaMenang !== null) {
        input.menang_hps_pct = (hargaMenang / hps) * 100;
    }
    if (totalAcuan !== null && totalAcuan > 0) {
        if (nilaiKontrak !== null) {
            input.selisih_harga_acuan_pct = ((nilaiKontrak - totalAcuan) / totalAcuan) * 100;
        }
        if (hps !== null) {
            input.selisih_hps_acuan_pct = ((hps - totalAcuan) / totalAcuan) * 100;
        }
    }
    if (persenCair !== null && persenFisik !== null) {
        input.cair_minus_fisik_poin = persenCair - persenFisik;
    }
    return input;
}
export async function recalculateProjectScore(pool, proyekId) {
    const config = loadScoringConfig();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const input = await collectScoreInput(client, proyekId);
        const result = scoreProject(input, config);
        await updateProyekScore(client, proyekId, result.skor_total, result.kategori);
        await deleteIndikatorTemuan(client, proyekId);
        for (const f of result.indikator_temuan) {
            await insertIndikatorTemuan(client, proyekId, f);
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
