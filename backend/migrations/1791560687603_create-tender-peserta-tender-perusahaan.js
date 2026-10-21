/**
 * Fase 1.3 — Tabel tender, peserta_tender, perusahaan (SRS 4.3).
 *
 * perusahaan hanya memuat nama_badan_usaha + npwp_hash (DR-07, AC-16):
 * tidak ada NIK / alamat pribadi / nomor telepon.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('perusahaan', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    nama_badan_usaha: { type: 'text', notNull: true },
    npwp_hash: 'text',
    // Kolom umum (FR-49, DR-01)
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createTable('tender', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proyek_id: { type: 'uuid', notNull: true, references: 'proyek' },
    jumlah_peserta: 'integer',
    jumlah_penawar: 'integer',
    harga_penawaran_menang: 'bigint',
    tgl_pengumuman: 'date',
    tgl_penetapan: 'date',
    // Kolom umum (FR-49, DR-01)
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createTable(
    'peserta_tender',
    {
      tender_id: { type: 'uuid', notNull: true, references: 'tender' },
      perusahaan_id: { type: 'uuid', notNull: true, references: 'perusahaan' },
      harga_penawaran: 'bigint',
      menang: { type: 'boolean', notNull: true, default: false },
      // Kolom umum (FR-49, DR-01)
      source_id: 'text',
      source_url: 'text',
      fetched_at: 'timestamptz',
      is_dummy: { type: 'boolean', notNull: true, default: false },
    },
    { constraints: { primaryKey: ['tender_id', 'perusahaan_id'] } }
  );

  pgm.createIndex('tender', 'proyek_id');
  pgm.createIndex('peserta_tender', 'perusahaan_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('peserta_tender');
  pgm.dropTable('tender');
  pgm.dropTable('perusahaan');
};
