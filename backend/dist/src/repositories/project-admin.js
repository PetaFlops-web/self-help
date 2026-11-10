import pool from '../config/database.js';
export const SCORE_TRIGGER_COLUMNS = [
    'pagu',
    'hps',
    'nilai_kontrak',
    'jumlah_penawar',
    'hari_rup_ke_tender',
];
// Angka besar dan tanggal dikembalikan sebagai teks agar perbandingan
// sebelum/sesudah stabil dan tanggal tidak bergeser zona waktu.
const PROJECT_SELECT = `
  id, kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran,
  sumber_dana, metode_pemilihan, pagu::text AS pagu, hps::text AS hps,
  nilai_kontrak::text AS nilai_kontrak, status,
  to_char(pengumuman_rup_tgl, 'YYYY-MM-DD') AS pengumuman_rup_tgl,
  asal_data, skor_total::text AS skor_total, kategori
`;
const TENDER_SELECT = `
  id, proyek_id, jumlah_penawar, jumlah_peserta,
  harga_penawaran_menang::text AS harga_penawaran_menang,
  to_char(tgl_pengumuman, 'YYYY-MM-DD') AS tgl_pengumuman,
  to_char(tgl_penetapan, 'YYYY-MM-DD') AS tgl_penetapan
`;
export const PROJECT_WRITABLE_FIELDS = [
    'nama', 'dinas', 'kode_bps', 'tahun_anggaran', 'pagu', 'kode_rup', 'kode_tender',
    'hps', 'nilai_kontrak', 'sumber_dana', 'metode_pemilihan', 'pengumuman_rup_tgl', 'status',
];
export const TENDER_WRITABLE_FIELDS = [
    'jumlah_penawar', 'harga_penawaran_menang', 'tgl_pengumuman', 'tgl_penetapan',
];
export async function checkKodeBpsExists(client, kodeBps) {
    const res = await client.query('SELECT 1 FROM wilayah WHERE kode_bps = $1', [kodeBps]);
    return (res.rowCount ?? 0) > 0;
}
export async function checkKodeRupExists(client, kodeRup, excludeId) {
    const res = await client.query('SELECT 1 FROM proyek WHERE kode_rup = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)', [kodeRup, excludeId ?? null]);
    return (res.rowCount ?? 0) > 0;
}
export async function checkKodeTenderExists(client, kodeTender, excludeId) {
    const res = await client.query('SELECT 1 FROM proyek WHERE kode_tender = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)', [kodeTender, excludeId ?? null]);
    return (res.rowCount ?? 0) > 0;
}
/** `forUpdate` mengunci baris proyek sampai transaksi pemanggil selesai. */
export async function getProjectForAdmin(client, id, forUpdate = false) {
    const res = await client.query(`SELECT ${PROJECT_SELECT} FROM proyek WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
    return res.rows[0] ?? null;
}
export async function getScoreTriggerSnapshot(client, projectId) {
    const res = await client.query(`SELECT p.pagu::text AS pagu,
            p.hps::text AS hps,
            p.nilai_kontrak::text AS nilai_kontrak,
            t.jumlah_penawar::text AS jumlah_penawar,
            (t.tgl_pengumuman - p.pengumuman_rup_tgl)::text AS hari_rup_ke_tender
       FROM proyek p
       LEFT JOIN LATERAL (
         SELECT jumlah_penawar, tgl_pengumuman
           FROM tender
          WHERE proyek_id = p.id
          ORDER BY tgl_penetapan DESC NULLS LAST, id DESC
          LIMIT 1
       ) t ON true
      WHERE p.id = $1`, [projectId]);
    return res.rows[0] ?? {
        pagu: null, hps: null, nilai_kontrak: null, jumlah_penawar: null, hari_rup_ke_tender: null,
    };
}
export async function createProjectAdmin(client, data, createdBy) {
    const cols = ['asal_data', 'dibuat_oleh', 'dibuat_pada', 'match_status', 'is_dummy'];
    const vals = ['manual_admin', createdBy, new Date(), 'unmatched', false];
    for (const col of PROJECT_WRITABLE_FIELDS) {
        if (data[col] !== undefined && data[col] !== null) {
            cols.push(col);
            vals.push(data[col]);
        }
    }
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const res = await client.query(`INSERT INTO proyek (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`, vals);
    return res.rows[0].id;
}
export async function updateProjectAdmin(client, id, data, updatedBy) {
    const sets = ['diubah_oleh = $1', 'diubah_pada = $2'];
    const vals = [updatedBy, new Date()];
    for (const col of PROJECT_WRITABLE_FIELDS) {
        if (data[col] !== undefined) {
            vals.push(data[col]);
            sets.push(`${col} = $${vals.length}`);
        }
    }
    vals.push(id);
    await client.query(`UPDATE proyek SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
}
/**
 * Hapus proyek beserta turunannya (SRS §9.4). Wajib dipanggil di dalam
 * transaksi. laporan_warga tidak dihapus (kesaksian, bukan turunan) dan
 * riwayat_nilai tidak disentuh (append-only, SRS §4.7).
 */
export async function deleteProjectCascade(client, projectId) {
    await client.query('UPDATE laporan_warga SET proyek_id = NULL WHERE proyek_id = $1', [projectId]);
    // peserta_tender tidak punya proyek_id; terhubung lewat tender_id.
    await client.query('DELETE FROM peserta_tender WHERE tender_id IN (SELECT id FROM tender WHERE proyek_id = $1)', [projectId]);
    for (const table of ['penjelasan_llm', 'indikator_temuan', 'rab_item', 'progres', 'pembayaran', 'tender', 'prosedur_checklist', 'dokumen']) {
        await client.query(`DELETE FROM ${table} WHERE proyek_id = $1`, [projectId]);
    }
    await client.query('DELETE FROM proyek_pencocokan WHERE proyek_id = $1 OR pasangan_id = $1', [projectId]);
    await client.query('DELETE FROM proyek WHERE id = $1', [projectId]);
}
export async function insertRiwayatNilai(client, input) {
    await client.query(`INSERT INTO riwayat_nilai (proyek_id, kolom, nilai_lama, nilai_baru, skor_sebelum, skor_sesudah, aktor_id, aktor_nama, peran, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [input.proyek_id, input.kolom, input.nilai_lama, input.nilai_baru, input.skor_sebelum, input.skor_sesudah, input.aktor_id, input.aktor_nama, input.peran, input.ip]);
}
export async function listValueHistory(projectId, limit, offset) {
    const countRes = await pool.query('SELECT COUNT(*) AS count FROM riwayat_nilai WHERE proyek_id = $1', [projectId]);
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);
    const res = await pool.query(`SELECT id, proyek_id, kolom, nilai_lama, nilai_baru,
            skor_sebelum::text AS skor_sebelum, skor_sesudah::text AS skor_sesudah,
            aktor_nama, peran, waktu
       FROM riwayat_nilai
      WHERE proyek_id = $1
      ORDER BY waktu DESC, id DESC
      LIMIT $2 OFFSET $3`, [projectId, limit, offset]);
    return { rows: res.rows, total };
}
export async function getTenderById(client, id, forUpdate = false) {
    const res = await client.query(`SELECT ${TENDER_SELECT} FROM tender WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
    return res.rows[0] ?? null;
}
export async function getTendersByProjectId(client, projectId) {
    const res = await client.query(`SELECT ${TENDER_SELECT} FROM tender WHERE proyek_id = $1 ORDER BY tgl_penetapan DESC NULLS LAST, id DESC`, [projectId]);
    return res.rows;
}
export async function createTenderAdmin(client, proyekId, data) {
    const res = await client.query(`INSERT INTO tender (proyek_id, jumlah_penawar, jumlah_peserta, harga_penawaran_menang, tgl_pengumuman, tgl_penetapan, is_dummy)
     VALUES ($1, $2, $2, $3, $4, $5, false)
     RETURNING id`, [proyekId, data.jumlah_penawar ?? 0, data.harga_penawaran_menang ?? null, data.tgl_pengumuman ?? null, data.tgl_penetapan ?? null]);
    return res.rows[0].id;
}
export async function updateTenderAdmin(client, id, data) {
    const sets = [];
    const vals = [];
    for (const col of TENDER_WRITABLE_FIELDS) {
        if (data[col] !== undefined) {
            vals.push(data[col]);
            sets.push(`${col} = $${vals.length}`);
        }
    }
    if (sets.length === 0)
        return;
    vals.push(id);
    await client.query(`UPDATE tender SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
}
export async function deleteTenderAdmin(client, id) {
    await client.query('DELETE FROM peserta_tender WHERE tender_id = $1', [id]);
    await client.query('DELETE FROM tender WHERE id = $1', [id]);
}
