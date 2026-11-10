/**
 * Pengerasan Fase 28 (temuan review 9 Nov 2026).
 *
 * 1. kode_tender unik bila diisi — pengecekan aplikasi saja bisa ditembus dua
 *    permintaan bersamaan (SRS §9.2: bentrok → 409, bukan ditimpa).
 * 2. dibuat_oleh / diubah_oleh diberi FK ke pengguna (tracker 28.1).
 * 3. riwayat_nilai.proyek_id tidak lagi ON DELETE CASCADE. SRS §4.7: riwayat
 *    "append-only dan tidak dapat dihapus ... tidak ada aturan retensi yang
 *    menghapusnya". Cascade membuat penghapusan proyek ikut menghapus jejak
 *    penggeseran nilainya. FK dilepas agar baris riwayat tetap utuh (termasuk
 *    proyek_id aslinya) setelah proyek dihapus.
 */
exports.up = async (pgm) => {
  pgm.createIndex('proyek', 'kode_tender', {
    name: 'proyek_kode_tender_key',
    unique: true,
    where: "kode_tender IS NOT NULL AND asal_data = 'manual_admin'",
  });

  pgm.addConstraint('proyek', 'proyek_dibuat_oleh_fkey', {
    foreignKeys: { columns: 'dibuat_oleh', references: 'pengguna(id)', onDelete: 'SET NULL' },
  });
  pgm.addConstraint('proyek', 'proyek_diubah_oleh_fkey', {
    foreignKeys: { columns: 'diubah_oleh', references: 'pengguna(id)', onDelete: 'SET NULL' },
  });

  pgm.dropConstraint('riwayat_nilai', 'riwayat_nilai_proyek_id_fkey');
};

exports.down = async (pgm) => {
  pgm.addConstraint('riwayat_nilai', 'riwayat_nilai_proyek_id_fkey', {
    foreignKeys: { columns: 'proyek_id', references: 'proyek(id)', onDelete: 'CASCADE' },
  });
  pgm.dropConstraint('proyek', 'proyek_diubah_oleh_fkey');
  pgm.dropConstraint('proyek', 'proyek_dibuat_oleh_fkey');
  pgm.dropIndex('proyek', 'kode_tender', { name: 'proyek_kode_tender_key' });
};
