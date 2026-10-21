/**
 * Fase 6 — Tambah kolom anonim dan dibuat_pada pada laporan_warga.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumn('laporan_warga', {
    anonim: { type: 'boolean', notNull: true, default: false },
    dibuat_pada: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    diubah_pada: { type: 'timestamptz' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('laporan_warga', 'diubah_pada');
  pgm.dropColumn('laporan_warga', 'dibuat_pada');
  pgm.dropColumn('laporan_warga', 'anonim');
};
