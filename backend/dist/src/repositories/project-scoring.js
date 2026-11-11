export async function getProjectRow(client, projectId) {
    const res = await client.query('SELECT dinas, kode_bps, tahun_anggaran, hps, nilai_kontrak FROM proyek WHERE id = $1', [projectId]);
    return res.rows[0];
}
export async function getDepartmentBudgetRows(client, dinas, kodeBps, tahun) {
    const res = await client.query(`SELECT tahun, pagu
       FROM anggaran_dinas
      WHERE dinas = $1
        AND kode_bps = $2
        AND tahun IN ($3, $4)`, [dinas, kodeBps, tahun, tahun - 1]);
    return res.rows;
}
export async function getWinningCompanyId(client, projectId) {
    const res = await client.query(`SELECT pt.perusahaan_id
       FROM tender t
       JOIN peserta_tender pt ON pt.tender_id = t.id
      WHERE t.proyek_id = $1
        AND pt.menang = true
      ORDER BY t.tgl_penetapan DESC NULLS LAST, t.id DESC, pt.perusahaan_id ASC
      LIMIT 1`, [projectId]);
    return res.rows[0]?.perusahaan_id ?? null;
}
export async function getWinnerConcentrationStats(client, dinas, tahunAnggaran, companyId) {
    const res = await client.query(`SELECT COUNT(DISTINCT t.proyek_id)::int AS total_paket,
            COUNT(DISTINCT t.proyek_id) FILTER (WHERE pt.perusahaan_id = $3)::int AS paket_menang
       FROM tender t
       JOIN proyek p ON p.id = t.proyek_id
       JOIN peserta_tender pt ON pt.tender_id = t.id AND pt.menang = true
      WHERE p.dinas = $1
        AND p.tahun_anggaran = $2`, [dinas, tahunAnggaran, companyId]);
    return res.rows[0] ?? { total_paket: 0, paket_menang: 0 };
}
export async function getTenderRow(client, projectId) {
    const res = await client.query(`SELECT t.jumlah_penawar,
            t.harga_penawaran_menang,
            (t.tgl_pengumuman - p.pengumuman_rup_tgl) AS hari_rup_ke_tender
       FROM tender t
       JOIN proyek p ON p.id = t.proyek_id
      WHERE t.proyek_id = $1
      ORDER BY t.tgl_penetapan DESC NULLS LAST, t.id DESC
      LIMIT 1`, [projectId]);
    return res.rows[0];
}
export async function getPaymentDisbursedPercentage(client, projectId) {
    const res = await client.query('SELECT COALESCE(SUM(persen_kontrak), 0) AS persen_cair FROM pembayaran WHERE proyek_id = $1', [projectId]);
    return res.rows[0]?.persen_cair;
}
export async function getPhysicalProgressPercentage(client, projectId) {
    const res = await client.query(`SELECT persen_fisik FROM progres
      WHERE proyek_id = $1
      ORDER BY tanggal DESC NULLS LAST, id DESC
      LIMIT 1`, [projectId]);
    return res.rows[0]?.persen_fisik;
}
export async function getVerifiedReportCount(client, projectId) {
    const res = await client.query(`SELECT COUNT(*) AS jumlah_laporan_terverifikasi
       FROM laporan_warga
      WHERE proyek_id = $1 AND status = 'Diverifikasi'`, [projectId]);
    return res.rows[0]?.jumlah_laporan_terverifikasi;
}
export async function getRabTotalReference(client, projectId) {
    const res = await client.query(`SELECT COALESCE(SUM(ri.volume * ha.harga), 0) AS total_acuan
       FROM rab_item ri
       LEFT JOIN harga_acuan ha ON ha.kode = ri.kode_harga_acuan
      WHERE ri.proyek_id = $1`, [projectId]);
    return res.rows[0]?.total_acuan;
}
export async function getRabTotalVolume(client, projectId) {
    const res = await client.query(`SELECT COALESCE(SUM(volume), 0) AS total_volume
       FROM rab_item
      WHERE proyek_id = $1`, [projectId]);
    return res.rows[0]?.total_volume;
}
export async function getVerifiedFieldMeasurements(client, projectId) {
    const res = await client.query(`SELECT ukuran_lapangan
       FROM laporan_warga
      WHERE proyek_id = $1
        AND status = 'Diverifikasi'
        AND ukuran_lapangan IS NOT NULL`, [projectId]);
    return res.rows;
}
export async function getUnpublishedDocumentSummary(client, projectId) {
    const res = await client.query(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE wajib = true)::int AS wajib,
            COUNT(*) FILTER (WHERE wajib = true AND dipublikasikan = false)::int AS belum_publik
       FROM dokumen
      WHERE proyek_id = $1`, [projectId]);
    return res.rows[0];
}
export async function getUnfulfilledProcedureSummary(client, projectId) {
    const res = await client.query(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE terpenuhi = true)::int AS terpenuhi,
            COUNT(*) FILTER (WHERE terpenuhi = false)::int AS tidak_terpenuhi
       FROM prosedur_checklist
      WHERE proyek_id = $1`, [projectId]);
    return res.rows[0];
}
export async function updateProjectScore(client, projectId, skorTotal, kategori) {
    await client.query('UPDATE proyek SET skor_total = $2, kategori = $3 WHERE id = $1', [projectId, skorTotal, kategori]);
}
export async function deleteIndicatorFindingsByProjectId(client, projectId) {
    await client.query('DELETE FROM indikator_temuan WHERE proyek_id = $1', [projectId]);
}
export async function insertIndicatorFinding(client, projectId, f) {
    await client.query(`INSERT INTO indikator_temuan
       (proyek_id, dimensi, kode_aturan, nilai_terukur, ambang, tingkat,
        bukti_ref, sumber, uraian_aturan, dihitung_pada)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`, [
        projectId,
        f.dimensi,
        f.kode_aturan,
        f.nilai_terukur,
        f.ambang,
        f.tingkat,
        f.bukti_ref ?? null,
        f.sumber,
        f.uraian_aturan,
    ]);
}
