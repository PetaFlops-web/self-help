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
