import { getProyekById } from '../repositories/proyek.js';
import { listLaporanTerverifikasi } from '../repositories/laporan-warga.js';
import { collectScoreInput } from './project-scoring.js';
import { scoreProject } from './scoring.js';
import { loadScoringConfig } from '../config/scoring.js';
import { callLlmService, LlmServiceUnavailableError } from './llm-client.js';
import { HttpError } from '../helpers/http.js';
import { toNum } from '../helpers/number.js';
import pool from '../config/database.js';
const STANDARD_DISCLAIMER = 'Ini indikator risiko untuk diperiksa, bukan bukti pelanggaran atau kesimpulan hukum.';
const VERSI_PROMPT = 'explain-v1';
const LEMBAGA_LABELS = {
    inspektorat: 'Inspektorat',
    BPK: 'BPK',
    KPK: 'KPK',
    Ombudsman: 'Ombudsman',
    dinas_terkait: 'Dinas Terkait',
};
function isUuidLike(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
function tanggalData(proyek) {
    const d = proyek.fetched_at instanceof Date ? proyek.fetched_at : new Date(proyek.fetched_at ?? '');
    if (Number.isNaN(d.getTime()))
        return undefined;
    return d.toISOString().slice(0, 10);
}
async function loadProjectAndScore(proyekId) {
    if (!isUuidLike(proyekId)) {
        throw new HttpError(400, 'id proyek harus UUID yang valid');
    }
    const proyek = await getProyekById(proyekId);
    if (!proyek) {
        throw new HttpError(404, 'Proyek tidak ditemukan');
    }
    const input = await collectScoreInput(pool, proyekId);
    const result = scoreProject(input, loadScoringConfig());
    return { proyek, result };
}
function buildPayload(proyek, result, tugas, tujuanPembaca, laporan) {
    const indikator = result.indikator_temuan.map((f) => ({
        kode_aturan: f.kode_aturan,
        dimensi: f.dimensi,
        tingkat: f.tingkat,
        nilai: f.nilai_terukur,
        ambang: f.ambang,
        uraian_aturan: f.uraian_aturan,
        sumber: f.sumber,
        tanggal_data: tanggalData(proyek),
    }));
    return {
        versi_prompt: VERSI_PROMPT,
        tugas,
        proyek: {
            id: proyek.id,
            nama: proyek.nama,
            dinas: proyek.dinas,
            kabupaten: proyek.kabupaten,
            tahun_anggaran: proyek.tahun_anggaran,
            pagu: toNum(proyek.pagu),
            nilai_kontrak: toNum(proyek.nilai_kontrak),
            is_dummy: proyek.is_dummy,
        },
        skor: {
            total: toNum(proyek.skor_total) ?? result.skor_total,
            kategori: proyek.kategori ?? result.kategori,
            dimensi: result.dimensi,
        },
        indikator,
        dimensi_data_belum_cukup: result.dimensi_data_belum_cukup,
        laporan_terverifikasi: laporan,
        tujuan_pembaca: tujuanPembaca,
    };
}
function fallbackTemuan(result) {
    return result.indikator_temuan.slice(0, 6).map((f) => ({
        kode_aturan: f.kode_aturan,
        penjelasan: `Indikator ${f.kode_aturan}: ${f.uraian_aturan} — nilai ${f.nilai_terukur}, ambang tinggi ${f.ambang}. Sumber: ${f.sumber}.`,
        arti_bagi_warga: 'Hal ini patut ditanyakan kepada instansi terkait untuk diperiksa kewajarannya.',
    }));
}
export function buildFallbackExplain(proyek, result) {
    const total = toNum(proyek.skor_total) ?? result.skor_total;
    const kategori = proyek.kategori ?? result.kategori;
    const keterbatasan = result.dimensi_data_belum_cukup.map((d) => `Dimensi ${d} belum dinilai karena data belum cukup.`);
    if (proyek.is_dummy) {
        keterbatasan.push('Data ini merupakan data simulasi (dummy), bukan data proyek sebenarnya.');
    }
    return {
        ringkasan: `Proyek ini mendapat skor risiko ${total ?? '-'}${kategori ? ` (${kategori})` : ''} berdasarkan data yang tersedia. Skor ini adalah indikator untuk diperiksa, bukan bukti pelanggaran.`,
        temuan: fallbackTemuan(result),
        keterbatasan,
        saran_tindak_lanjut: [
            { langkah: 'Minta klarifikasi dokumen pendukung kepada instansi terkait.', lembaga: 'dinas_terkait' },
        ],
        penafian: STANDARD_DISCLAIMER,
    };
}
export function buildFallbackDraft(proyek, result, tujuan, laporan) {
    const uraian = result.indikator_temuan.slice(0, 6).map((f) => ({
        kode_aturan: f.kode_aturan,
        penjelasan: `Indikator ${f.kode_aturan}: ${f.uraian_aturan} — nilai ${f.nilai_terukur}, ambang tinggi ${f.ambang}.`,
        arti_bagi_warga: 'Indikator ini patut ditanyakan untuk diperiksa kewajarannya.',
    }));
    const tiket = laporan
        .map((l) => l.tiket)
        .filter((t) => typeof t === 'string' && t.length > 0);
    const sumber = [...new Set(result.indikator_temuan.map((f) => f.sumber).filter(Boolean))];
    return {
        kepada: LEMBAGA_LABELS[tujuan],
        perihal: `Permohonan klarifikasi indikator risiko proyek "${proyek.nama}"`,
        pembuka: `Kami mengajukan permohonan klarifikasi atas indikator risiko pada proyek "${proyek.nama}"${proyek.dinas ? ` (${proyek.dinas})` : ''}${proyek.kabupaten ? ` di ${proyek.kabupaten}` : ''}.`,
        uraian_indikator: uraian,
        permohonan: 'Kami memohon klarifikasi berupa penjelasan dan dokumen pendukung terkait indikator di atas.',
        penutup: 'Demikian permohonan ini disampaikan; atas perhatian dan penjelasannya kami ucapkan terima kasih.',
        penafian: STANDARD_DISCLAIMER,
        lampiran_disarankan: [...tiket.map((t) => `Tiket laporan ${t}`), ...sumber.map((s) => `Sumber data ${s}`)],
    };
}
export async function explainProject(id) {
    const { proyek, result } = await loadProjectAndScore(id);
    const laporan = await listLaporanTerverifikasi(id);
    const payload = buildPayload(proyek, result, 'explain', 'warga awam', laporan);
    try {
        const output = (await callLlmService(payload));
        return { generated_by: 'llm', ...output };
    }
    catch (err) {
        if (err instanceof LlmServiceUnavailableError) {
            return { generated_by: 'fallback', ...buildFallbackExplain(proyek, result) };
        }
        throw err;
    }
}
export async function draftProject(id, tujuan) {
    const { proyek, result } = await loadProjectAndScore(id);
    const laporan = await listLaporanTerverifikasi(id);
    const payload = buildPayload(proyek, result, 'draft', tujuan, laporan);
    try {
        const output = (await callLlmService(payload));
        return { generated_by: 'llm', ...output };
    }
    catch (err) {
        if (err instanceof LlmServiceUnavailableError) {
            return { generated_by: 'fallback', ...buildFallbackDraft(proyek, result, tujuan, laporan) };
        }
        throw err;
    }
}
