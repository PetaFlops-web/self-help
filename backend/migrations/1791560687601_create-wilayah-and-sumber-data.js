/**
 * Fase 1.1 — Tabel referensi wilayah (geo) dan sumber_data (SRS 4.1).
 *
 * Kolom umum source_id / source_url / fetched_at / is_dummy (FR-49, DR-01)
 * dipakai pada tabel data proyek mulai 1.2, TIDAK pada tabel referensi ini.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('wilayah', {
    kode_bps: { type: 'text', primaryKey: true },
    nama: { type: 'text', notNull: true },
    lat: 'numeric',
    lng: 'numeric',
    geojson: 'jsonb',
  });

  pgm.createTable('sumber_data', {
    source_id: { type: 'text', primaryKey: true },
    nama: { type: 'text', notNull: true },
    url: 'text',
    lisensi: 'text',
    atribusi: 'text',
    boleh_otomatis: { type: 'boolean', notNull: true, default: false },
    last_fetched_at: 'timestamptz',
    row_count: 'integer',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('sumber_data');
  pgm.dropTable('wilayah');
};
