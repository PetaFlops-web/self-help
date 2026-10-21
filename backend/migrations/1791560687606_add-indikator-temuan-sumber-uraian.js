/**
 * Fase 2.4 (pendukung) — Tambah kolom sumber & uraian_aturan ke indikator_temuan.
 *
 * FR-16 dan SRS 4.5 mensyaratkan indikator_temuan menyimpan "sumber", dan
 * templat penjelasan cadangan (SRS 6.9) memakai uraian_aturan. Kolom ini belum
 * ada pada migrasi 1.5, sehingga ditambahkan di sini sebelum hasil skor
 * dipersisten (Fase 2.4).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumns('indikator_temuan', {
    sumber: 'text',
    uraian_aturan: 'text',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('indikator_temuan', ['sumber', 'uraian_aturan']);
};
