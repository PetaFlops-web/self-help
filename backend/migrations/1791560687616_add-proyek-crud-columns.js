exports.up = async (pgm) => {
  pgm.addColumns('proyek', {
    asal_data: { type: 'text', notNull: true, default: "'pemerintah'" },
    dibuat_oleh: { type: 'uuid', notNull: false },
    diubah_oleh: { type: 'uuid', notNull: false },
    dibuat_pada: { type: 'timestamptz', notNull: false },
    diubah_pada: { type: 'timestamptz', notNull: false },
  });
};

exports.down = async (pgm) => {
  pgm.dropColumns('proyek', ['asal_data', 'dibuat_oleh', 'diubah_oleh', 'dibuat_pada', 'diubah_pada']);
};
