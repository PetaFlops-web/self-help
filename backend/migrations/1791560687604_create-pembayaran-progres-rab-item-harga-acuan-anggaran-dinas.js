/**
 * Fase 1.4 — Tabel pembayaran, progres, rab_item, harga_acuan, anggaran_dinas
 * (SRS 4.4).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('harga_acuan', {
    kode: { type: 'text', primaryKey: true },
    uraian: 'text',
    satuan: 'text',
    harga: 'bigint',
    kode_bps: 'text',
    tahun: 'smallint',
    // Kolom umum (FR-49, DR-01)
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createTable('pembayaran', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proyek_id: { type: 'uuid', notNull: true, references: 'proyek' },
    termin_ke: 'smallint',
    tanggal: 'date',
    jumlah: 'bigint',
    persen_kontrak: 'numeric',
    // Kolom umum (FR-49, DR-01)
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createTable('progres', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proyek_id: { type: 'uuid', notNull: true, references: 'proyek' },
    tanggal: 'date',
    persen_fisik: 'numeric',
    sumber: 'text',
    // Kolom umum (FR-49, DR-01)
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createTable('rab_item', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proyek_id: { type: 'uuid', notNull: true, references: 'proyek' },
    uraian: 'text',
    satuan: 'text',
    volume: 'numeric',
    harga_satuan: 'bigint',
    kode_harga_acuan: { type: 'text', references: 'harga_acuan' },
    // Kolom umum (FR-49, DR-01)
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createTable(
    'anggaran_dinas',
    {
      dinas: { type: 'text', notNull: true },
      kode_bps: { type: 'text', notNull: true },
      tahun: { type: 'smallint', notNull: true },
      pagu: 'bigint',
      realisasi: 'bigint',
      // Kolom umum (FR-49, DR-01)
      source_id: 'text',
      source_url: 'text',
      fetched_at: 'timestamptz',
      is_dummy: { type: 'boolean', notNull: true, default: false },
    },
    { constraints: { primaryKey: ['dinas', 'kode_bps', 'tahun'] } }
  );

  pgm.createIndex('pembayaran', 'proyek_id');
  pgm.createIndex('progres', 'proyek_id');
  pgm.createIndex('rab_item', 'proyek_id');
  pgm.createIndex('rab_item', 'kode_harga_acuan');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('anggaran_dinas');
  pgm.dropTable('rab_item');
  pgm.dropTable('progres');
  pgm.dropTable('pembayaran');
  pgm.dropTable('harga_acuan');
};
