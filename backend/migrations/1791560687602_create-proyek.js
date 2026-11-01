export const shorthands = undefined;

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
    source_id: 'text',
    source_url: 'text',
    fetched_at: 'timestamptz',
    is_dummy: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createIndex('proyek', 'kode_bps');
};

export const down = (pgm) => {
  pgm.dropTable('proyek');
};
