export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('dokumen', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proyek_id: { type: 'uuid', notNull: true, references: 'proyek', onDelete: 'CASCADE' },
    jenis: { type: 'text', notNull: true },
    wajib: { type: 'boolean', notNull: true, default: false },
    dipublikasikan: { type: 'boolean', notNull: true, default: false },
    tanggal: { type: 'date' },
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createTable('prosedur_checklist', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proyek_id: { type: 'uuid', notNull: true, references: 'proyek', onDelete: 'CASCADE' },
    tahapan: { type: 'text', notNull: true },
    terpenuhi: { type: 'boolean', notNull: true, default: false },
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createIndex('dokumen', 'proyek_id');
  pgm.createIndex('prosedur_checklist', 'proyek_id');
};

export const down = (pgm) => {
  pgm.dropTable('prosedur_checklist');
  pgm.dropTable('dokumen');
};
