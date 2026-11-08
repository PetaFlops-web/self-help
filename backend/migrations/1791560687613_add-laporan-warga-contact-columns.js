exports.up = async (pgm) => {
  pgm.addColumns('laporan_warga', {
    nama_pelapor: { type: 'bytea', notNull: false },
    surel_pelapor: { type: 'text', notNull: false },
    telepon_pelapor: { type: 'bytea', notNull: false },
    kontak_dihapus_pada: { type: 'timestamptz', notNull: false },
  });
  pgm.createIndex('laporan_warga', 'kontak_dihapus_pada');
};

exports.down = async (pgm) => {
  pgm.dropIndex('laporan_warga', 'kontak_dihapus_pada');
  pgm.dropColumns('laporan_warga', ['nama_pelapor', 'surel_pelapor', 'telepon_pelapor', 'kontak_dihapus_pada']);
};
