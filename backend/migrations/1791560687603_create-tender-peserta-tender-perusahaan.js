export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('perusahaan', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    nama_badan_usaha: { type: 'text', notNull: true },
    npwp_hash: 'text',
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

export const down = (pgm) => {
  pgm.dropTable('peserta_tender');
  pgm.dropTable('tender');
  pgm.dropTable('perusahaan');
};
