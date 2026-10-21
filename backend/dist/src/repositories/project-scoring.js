export async function getProyekRow(client, proyekId) {
    const res = await client.query('SELECT hps, nilai_kontrak FROM proyek WHERE id = $1', [proyekId]);
    return res.rows[0];
}
export async function getTenderRow(client, proyekId) {
    const res = await client.query(`SELECT t.jumlah_penawar,
            t.harga_penawaran_menang,
            (t.tgl_pengumuman - p.pengumuman_rup_tgl) AS hari_rup_ke_tender
       FROM tender t
       JOIN proyek p ON p.id = t.proyek_id
      WHERE t.proyek_id = $1
      ORDER BY t.tgl_penetapan DESC NULLS LAST, t.id DESC
      LIMIT 1`, [proyekId]);
    return res.rows[0];
}
export async function getPembayaranCair(client, proyekId) {
    const res = await client.query('SELECT COALESCE(SUM(persen_kontrak), 0) AS persen_cair FROM pembayaran WHERE proyek_id = $1', [proyekId]);
    return res.rows[0]?.persen_cair;
}
export async function getProgresFisik(client, proyekId) {
    const res = await client.query(`SELECT persen_fisik FROM progres
      WHERE proyek_id = $1
      ORDER BY tanggal DESC NULLS LAST, id DESC
      LIMIT 1`, [proyekId]);
    return res.rows[0]?.persen_fisik;
}
export async function getLaporanTerverifikasiCount(client, proyekId) {
    const res = await client.query(`SELECT COUNT(*) AS jumlah_laporan_terverifikasi
       FROM laporan_warga
      WHERE proyek_id = $1 AND status = 'Diverifikasi'`, [proyekId]);
    return res.rows[0]?.jumlah_laporan_terverifikasi;
}
export async function getRabTotalAcuan(client, proyekId) {
    const res = await client.query(`SELECT COALESCE(SUM(ri.volume * ha.harga), 0) AS total_acuan
       FROM rab_item ri
       LEFT JOIN harga_acuan ha ON ha.kode = ri.kode_harga_acuan
      WHERE ri.proyek_id = $1`, [proyekId]);
    return res.rows[0]?.total_acuan;
}
export async function updateProyekScore(client, proyekId, skorTotal, kategori) {
    await client.query('UPDATE proyek SET skor_total = $2, kategori = $3 WHERE id = $1', [proyekId, skorTotal, kategori]);
}
export async function deleteIndikatorTemuan(client, proyekId) {
    await client.query('DELETE FROM indikator_temuan WHERE proyek_id = $1', [proyekId]);
}
export async function insertIndikatorTemuan(client, proyekId, f) {
    await client.query(`INSERT INTO indikator_temuan
       (proyek_id, dimensi, kode_aturan, nilai_terukur, ambang, tingkat,
        bukti_ref, sumber, uraian_aturan, dihitung_pada)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`, [
        proyekId,
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
