export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('pengguna', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    nama: { type: 'text', notNull: true },
    surel: { type: 'text', notNull: true, unique: true },
    kata_sandi_hash: { type: 'text', notNull: true },
    peran: {
      type: 'text',
      notNull: true,
      check: "peran IN ('admin', 'verifikator', 'peninjau')",
    },
    aktif: { type: 'boolean', notNull: true, default: true },
    dibuat_pada: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

export const down = (pgm) => {
  pgm.dropTable('pengguna');
};
