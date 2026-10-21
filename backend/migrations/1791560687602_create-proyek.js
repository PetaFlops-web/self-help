/**
 * Fase 1.2 — Tabel proyek (SRS 4.2) + kolom umum (FR-49, DR-01).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('proyek', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    kode_rup: { type: 'text', unique: true },
    kode_tender: 'text',
    nama: { type: 'text', notNull: true },
    dinas: 'text',
    kode_bps: { type: 'text', references: 'wilayah' },
    lat: 'numeric',
    lng: 'numeric',
    tahun_anggaran: { type: 'smallint', notNull: true },
    sumber_dana: 'text',
    metode_pemilihan: 'text',
    pagu: 'bigint',
    hps: 'bigint',
    nilai_kontrak: 'bigint',
    status: 'text',
    pengumuman_rup_tgl: 'date',
    match_status: 'text',
    skor_total: 'numeric',
    kategori: 'text',
    // Kolom umum (FR-49, DR-01)
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createIndex('proyek', 'kode_bps');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('proyek');
};
