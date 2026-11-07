export const shorthands = undefined;

export const up = (pgm) => {
  pgm.addColumn('laporan_warga', {
    lembaga_tujuan: { type: 'text' },
    diteruskan_pada: { type: 'timestamptz' },
  });
};

export const down = (pgm) => {
  pgm.dropColumns('laporan_warga', ['lembaga_tujuan', 'diteruskan_pada']);
};
