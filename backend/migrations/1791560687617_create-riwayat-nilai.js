exports.up = async (pgm) => {
  pgm.createTable('riwayat_nilai', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proyek_id: { type: 'uuid', notNull: true, references: 'proyek(id)', onDelete: 'CASCADE' },
    kolom: { type: 'text', notNull: true },
    nilai_lama: { type: 'text', notNull: false },
    nilai_baru: { type: 'text', notNull: false },
    skor_sebelum: { type: 'numeric', notNull: false },
    skor_sesudah: { type: 'numeric', notNull: false },
    aktor_id: { type: 'uuid', notNull: false, references: 'pengguna(id)' },
    aktor_nama: { type: 'text', notNull: false },
    peran: { type: 'text', notNull: false },
    ip: { type: 'text', notNull: false },
    waktu: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('riwayat_nilai', 'proyek_id');
  pgm.createIndex('riwayat_nilai', 'waktu');
};

exports.down = async (pgm) => {
  pgm.dropTable('riwayat_nilai');
};
