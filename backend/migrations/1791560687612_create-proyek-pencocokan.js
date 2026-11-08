export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable(
    'proyek_pencocokan',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      proyek_id: { type: 'uuid', notNull: true, references: 'proyek' },
      pasangan_id: { type: 'uuid', notNull: true, references: 'proyek' },
      keputusan: { type: 'text', notNull: true },
      dibuat_pada: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { constraints: { unique: [['proyek_id', 'pasangan_id']] } },
  );
};

export const down = (pgm) => {
  pgm.dropTable('proyek_pencocokan');
};
