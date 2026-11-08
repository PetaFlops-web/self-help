exports.up = async (pgm) => {
  pgm.dropConstraint('notifikasi', 'notifikasi_tiket_fkey');
  pgm.addConstraint('notifikasi', 'notifikasi_tiket_fkey', {
    foreignKeys: {
      columns: 'tiket',
      references: 'laporan_warga(tiket)',
      onDelete: 'CASCADE',
    },
  });
};

exports.down = async (pgm) => {
  pgm.dropConstraint('notifikasi', 'notifikasi_tiket_fkey');
  pgm.addConstraint('notifikasi', 'notifikasi_tiket_fkey', {
    foreignKeys: {
      columns: 'tiket',
      references: 'laporan_warga(tiket)',
    },
  });
};
