exports.up = async (pgm) => {
  pgm.createTable('notifikasi', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tiket: { type: 'text', notNull: true, references: 'laporan_warga(tiket)' },
    kanal: { type: 'text', notNull: true },
    alamat_tujuan_hash: { type: 'text', notNull: false },
    status_dari: { type: 'text', notNull: false },
    status_ke: { type: 'text', notNull: false },
    status_kirim: { type: 'text', notNull: true, default: 'tertunda' },
    percobaan: { type: 'int', notNull: true, default: 0 },
    galat: { type: 'text', notNull: false },
    dibuat_pada: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    dikirim_pada: { type: 'timestamptz', notNull: false },
  });
  pgm.createIndex('notifikasi', 'tiket');
  pgm.createIndex('notifikasi', 'status_kirim');
};

exports.down = async (pgm) => {
  pgm.dropTable('notifikasi');
};
