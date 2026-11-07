export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('log_audit', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    waktu: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    aktor_id: { type: 'uuid' },
    aktor_nama: { type: 'text', notNull: true },
    peran: { type: 'text', notNull: true },
    modul: { type: 'text', notNull: true },
    aksi: { type: 'text', notNull: true },
    target_id: { type: 'text' },
    diff: { type: 'jsonb' },
    ip: { type: 'text' },
  });

  pgm.createIndex('log_audit', 'waktu');
  pgm.createIndex('log_audit', 'modul');
};

export const down = (pgm) => {
  pgm.dropTable('log_audit');
};
