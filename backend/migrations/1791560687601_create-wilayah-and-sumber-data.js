export const shorthands = undefined;

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

export const down = (pgm) => {
  pgm.dropTable('sumber_data');
  pgm.dropTable('wilayah');
};
