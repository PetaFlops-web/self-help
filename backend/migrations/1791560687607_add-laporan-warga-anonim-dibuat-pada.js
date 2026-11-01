export const shorthands = undefined;

export const up = (pgm) => {
  pgm.addColumn('laporan_warga', {
    anonim: { type: 'boolean', notNull: true, default: false },
    dibuat_pada: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    diubah_pada: { type: 'timestamptz' },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('laporan_warga', 'diubah_pada');
  pgm.dropColumn('laporan_warga', 'dibuat_pada');
  pgm.dropColumn('laporan_warga', 'anonim');
};
