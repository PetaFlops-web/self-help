export const shorthands = undefined;

export const up = (pgm) => {
  pgm.addColumns('indikator_temuan', {
    sumber: 'text',
    uraian_aturan: 'text',
  });
};

export const down = (pgm) => {
  pgm.dropColumns('indikator_temuan', ['sumber', 'uraian_aturan']);
};
