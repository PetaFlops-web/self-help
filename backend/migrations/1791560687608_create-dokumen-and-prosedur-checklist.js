/**
 * Fase 9.1 — Tabel dokumen dan prosedur_checklist (PRD §9, SRS D5/D6).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('dokumen', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proyek_id: { type: 'uuid', notNull: true, references: 'proyek', onDelete: 'CASCADE' },
    jenis: { type: 'text', notNull: true },
    wajib: { type: 'boolean', notNull: true, default: false },
    dipublikasikan: { type: 'boolean', notNull: true, default: false },
    tanggal: { type: 'date' },
    // Kolom umum (FR-49, DR-01)
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
    // Kolom umum (FR-49, DR-01)
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createIndex('dokumen', 'proyek_id');
  pgm.createIndex('prosedur_checklist', 'proyek_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('prosedur_checklist');
  pgm.dropTable('dokumen');
};
