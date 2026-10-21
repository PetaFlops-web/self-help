/**
 * Fase 1.5 — Tabel laporan_warga, indikator_temuan, penjelasan_llm, etl_error
 * (SRS 4.5).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('laporan_warga', {
    tiket: { type: 'text', primaryKey: true },
    proyek_id: { type: 'uuid', references: 'proyek' },
    kategori: 'text',
    keterangan: 'text',
    lat: 'numeric',
    lng: 'numeric',
    foto_urls: { type: 'text', array: true },
    ukuran_lapangan: 'numeric',
    status: 'text',
    alasan_tolak: 'text',
    catatan_verifikator: 'text',
    pelapor_terenkripsi: 'bytea',
  });

  pgm.createTable('indikator_temuan', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proyek_id: { type: 'uuid', notNull: true, references: 'proyek' },
    dimensi: 'text',
    kode_aturan: 'text',
    nilai_terukur: 'numeric',
    ambang: 'numeric',
    tingkat: 'text',
    bukti_ref: 'jsonb',
    dihitung_pada: 'timestamptz',
  });

  pgm.createTable('penjelasan_llm', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proyek_id: { type: 'uuid', notNull: true, references: 'proyek' },
    jenis: 'text',
    isi_json: 'jsonb',
    model: 'text',
    versi_prompt: 'text',
    input_hash: 'text',
    dibuat_pada: 'timestamptz',
  });

  pgm.createTable('etl_error', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    source_id: 'text',
    baris_mentah: 'jsonb',
    alasan: 'text',
  });

  pgm.createIndex('laporan_warga', 'proyek_id');
  pgm.createIndex('indikator_temuan', 'proyek_id');
  pgm.createIndex('penjelasan_llm', 'proyek_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('etl_error');
  pgm.dropTable('penjelasan_llm');
  pgm.dropTable('indikator_temuan');
  pgm.dropTable('laporan_warga');
};
