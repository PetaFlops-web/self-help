import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { validateProjectRow } from '../src/services/etl/validator.js';
import { parseSiRUPCsv } from '../src/services/etl/sirup-parser.js';
import { runEtl } from '../src/services/etl/runner.js';
import { HttpError } from '../src/helpers/http.js';
import { EtlRunBodySchema } from '../src/utils/validators/etl.js';
import pool from '../src/config/database.js';
import redisClient, { connectRedis } from '../src/config/redis.js';

const VALID_BPS = new Set(['1871']);
const TEST_URL = 'https://example.test/sirup.csv';

interface SourceBaseline {
  row_count: number | null;
  last_fetched_at: Date | null;
}

let sourceBaseline: SourceBaseline | null = null;

function validRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    kode_rup: 'TEST-RUP-VALID',
    kode_tender: 'TEST-TENDER-VALID',
    nama: 'Proyek Test Valid',
    dinas: 'Dinas Test',
    kode_bps: '1871',
    tahun_anggaran: '2025',
    pagu: '1000000000',
    hps: '900000000',
    sumber_dana: 'APBD',
    metode_pemilihan: 'Tender',
    pengumuman_rup_tgl: '2025-01-15',
    ...overrides,
  };
}

async function cleanupTestRows(): Promise<void> {
  await pool.query(
    `DELETE FROM proyek_pencocokan pair
      USING proyek project
     WHERE (pair.proyek_id = project.id OR pair.pasangan_id = project.id)
       AND project.kode_rup LIKE 'TEST-RUP-%'`,
  );
  await pool.query("DELETE FROM proyek WHERE kode_rup LIKE 'TEST-RUP-%'");
  await pool.query(
    `DELETE FROM etl_error
      WHERE source_id = 'SRC-01'
        AND baris_mentah->>'kode_rup' LIKE 'TEST-RUP-%'`,
  );
}

before(async () => {
  const source = await pool.query<SourceBaseline>(
    `SELECT row_count, last_fetched_at FROM sumber_data WHERE source_id = 'SRC-01'`,
  );
  sourceBaseline = source.rows[0] ?? null;
  await cleanupTestRows();
});

after(async () => {
  await cleanupTestRows();
  if (sourceBaseline) {
    await pool.query(
      `UPDATE sumber_data
          SET row_count = $2, last_fetched_at = $3
        WHERE source_id = $1`,
      ['SRC-01', sourceBaseline.row_count, sourceBaseline.last_fetched_at],
    );
  }
  if (redisClient.isOpen) await redisClient.quit();
  await pool.end();
});

test('EtlRunBodySchema: source_url malformed gagal tanpa melempar dan protokol divalidasi', () => {
  const body = {
    source_id: 'SRC-01',
    csv_content: 'kode_rup,nama_paket\nRUP1,Proyek A',
  };

  assert.doesNotThrow(() => {
    const result = EtlRunBodySchema.safeParse({ ...body, source_url: 'not-a-url' });
    assert.equal(result.success, false);
  });

  const fileResult = EtlRunBodySchema.safeParse({ ...body, source_url: 'file:///tmp/data.csv' });
  assert.equal(fileResult.success, false);

  const httpsResult = EtlRunBodySchema.safeParse({ ...body, source_url: TEST_URL });
  assert.equal(httpsResult.success, true);
});

test('validator: baris valid mengembalikan data ternormalisasi', () => {
  const result = validateProjectRow(validRow(), VALID_BPS);
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail('validasi seharusnya lolos');
  assert.equal(result.data.kode_rup, 'TEST-RUP-VALID');
  assert.equal(result.data.kode_tender, 'TEST-TENDER-VALID');
  assert.equal(result.data.tahun_anggaran, 2025);
  assert.equal(result.data.pagu, '1000000000');
  assert.equal(result.data.hps, '900000000');
});

test('validator: tahun kosong, nol, non-integer, dan luar rentang ditolak', () => {
  for (const tahun_anggaran of ['', '   ', '0', '1999', '2101', '2025.5']) {
    const result = validateProjectRow(validRow({ tahun_anggaran }), VALID_BPS);
    assert.equal(result.ok, false, `tahun ${JSON.stringify(tahun_anggaran)} seharusnya ditolak`);
    if (result.ok) assert.fail('validasi seharusnya gagal');
    assert.match(result.reason, /tahun_anggaran/);
  }
});

test('validator: batas tahun 2000 dan 2100 diterima', () => {
  for (const tahun_anggaran of ['2000', '2100']) {
    const result = validateProjectRow(validRow({ tahun_anggaran }), VALID_BPS);
    assert.equal(result.ok, true);
  }
});

test('validator: tanggal kalender tidak valid ditolak', () => {
  const result = validateProjectRow(
    validRow({ pengumuman_rup_tgl: '2026-02-31' }),
    VALID_BPS,
  );
  assert.equal(result.ok, false);
  if (result.ok) assert.fail('validasi seharusnya gagal');
  assert.match(result.reason, /pengumuman_rup_tgl/);
});

test('validator: HPS negatif gagal dengan alasan spesifik', () => {
  const result = validateProjectRow(validRow({ hps: '-100' }), VALID_BPS);
  assert.equal(result.ok, false);
  if (result.ok) assert.fail('validasi seharusnya gagal');
  assert.match(result.reason, /hps/);
});

test('validator: kode_bps tidak terdaftar di wilayah gagal', () => {
  const result = validateProjectRow(validRow({ kode_bps: '9999' }), VALID_BPS);
  assert.equal(result.ok, false);
  if (result.ok) assert.fail('validasi seharusnya gagal');
  assert.match(result.reason, /kode_bps/);
});

test('validator: kode_rup kosong gagal', () => {
  const result = validateProjectRow(validRow({ kode_rup: '' }), VALID_BPS);
  assert.equal(result.ok, false);
  if (result.ok) assert.fail('validasi seharusnya gagal');
  assert.match(result.reason, /kode_rup/);
});

test('CSV parser: field ternormalisasi dan payload asli lengkap tersedia', () => {
  const csv =
    'kode_rup,kode_tender,nama_paket,pagu,kolom_tambahan\nRUP1,TENDER1,Proyek A,1000000,nilai asli';
  const rows = parseSiRUPCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].normalized.kode_rup, 'RUP1');
  assert.equal(rows[0].normalized.kode_tender, 'TENDER1');
  assert.equal(rows[0].normalized.nama, 'Proyek A');
  assert.equal(rows[0].normalized.pagu, '1000000');
  assert.deepEqual(rows[0].raw, {
    kode_rup: 'RUP1',
    kode_tender: 'TENDER1',
    nama_paket: 'Proyek A',
    pagu: '1000000',
    kolom_tambahan: 'nilai asli',
  });
});

test('CSV parser: header asli dipertahankan sementara mapping tetap ternormalisasi', () => {
  const csv = ' kode_rup , nama_paket , kolom_tambahan \nRUP1,Proyek A,nilai asli';
  const rows = parseSiRUPCsv(csv);
  assert.equal(rows[0].normalized.kode_rup, 'RUP1');
  assert.equal(rows[0].normalized.nama, 'Proyek A');
  assert.deepEqual(rows[0].raw, {
    ' kode_rup ': 'RUP1',
    ' nama_paket ': 'Proyek A',
    ' kolom_tambahan ': 'nilai asli',
  });
});

test('CSV parser: field berpetik dengan koma dan baris baru tetap lolos', () => {
  const csv =
    'kode_rup,nama_paket,pagu\n"RUP1","Proyek, Khusus","1000000"\n"RUP2","Proyek\nMulti Baris","2000000"';
  const rows = parseSiRUPCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].normalized.nama, 'Proyek, Khusus');
  assert.equal(rows[1].normalized.nama, 'Proyek\nMulti Baris');
  assert.equal(rows[1].raw.nama_paket, 'Proyek\nMulti Baris');
});

test('runner: dua run idempoten, provenance terisi, row_count accepted, dan cache naik dua kali', async () => {
  const bpsRes = await pool.query<{ kode_bps: string }>('SELECT kode_bps FROM wilayah LIMIT 1');
  const kodeBps = bpsRes.rows[0]?.kode_bps ?? '1871';
  const csv =
    'kode_rup,kode_tender,nama_paket,satker,kode_bps,tahun_anggaran,pagu,hps,sumber_dana,metode_pemilihan,tgl_pembuatan_rup\n' +
    `TEST-RUP-001,TEST-TENDER-001,Proyek Test Satu,Dinas Test,${kodeBps},2025,1000000000,900000000,APBD,Tender,2025-01-15\n` +
    `TEST-RUP-002,TEST-TENDER-002,Proyek Test Dua,Dinas Test,${kodeBps},2025,2000000000,,APBD,Pengadaan Langsung,2025-02-20`;

  if (!redisClient.isOpen) await connectRedis();
  assert.equal(redisClient.isReady, true);
  const versionBefore = Number((await redisClient.get('cache:ver:projects')) ?? '0');

  const r1 = await runEtl('SRC-01', csv, TEST_URL);
  const versionAfterFirst = Number(await redisClient.get('cache:ver:projects'));
  const r2 = await runEtl('SRC-01', csv, TEST_URL);
  const versionAfterSecond = Number(await redisClient.get('cache:ver:projects'));

  const projects = await pool.query<{
    kode_rup: string;
    source_url: string | null;
    match_status: string | null;
  }>(
    `SELECT kode_rup, source_url, match_status
       FROM proyek
      WHERE kode_rup = ANY($1::text[])
      ORDER BY kode_rup`,
    [['TEST-RUP-001', 'TEST-RUP-002']],
  );
  const source = await pool.query<{ row_count: number }>(
    `SELECT row_count FROM sumber_data WHERE source_id = 'SRC-01'`,
  );

  assert.equal(r1.accepted, 2);
  assert.equal(r2.accepted, 2);
  assert.equal(r1.rejected, 0);
  assert.equal(r2.rejected, 0);
  assert.equal(projects.rows.length, 2);
  assert.ok(projects.rows.every((row) => row.source_url === TEST_URL));
  assert.equal(source.rows[0].row_count, 2);
  assert.equal(versionAfterFirst, versionBefore + 1);
  assert.equal(versionAfterSecond, versionBefore + 2);
});

test('runner: duplikat file dan baris invalid menjadi partial dengan raw payload utuh', async () => {
  const bpsRes = await pool.query<{ kode_bps: string }>('SELECT kode_bps FROM wilayah LIMIT 1');
  const kodeBps = bpsRes.rows[0]?.kode_bps ?? '1871';
  const csv =
    'kode_rup,kode_tender,nama_paket,satker,kode_bps,tahun_anggaran,pagu,kolom_tambahan\n' +
    `TEST-RUP-DUP,TEST-TENDER-DUP,Proyek Pertama,Dinas Test,${kodeBps},2025,1000,alpha\n` +
    `TEST-RUP-DUP,TEST-TENDER-DUP,Proyek Duplikat,Dinas Test,${kodeBps},2025,2000,beta\n` +
    `TEST-RUP-BAD-YEAR,TEST-TENDER-BAD,Proyek Invalid,Dinas Test,${kodeBps},,3000,gamma`;

  const result = await runEtl('SRC-01', csv, TEST_URL);
  const project = await pool.query<{ nama: string; source_url: string }>(
    `SELECT nama, source_url FROM proyek WHERE kode_rup = 'TEST-RUP-DUP'`,
  );
  const errors = await pool.query<{
    baris_mentah: Record<string, string>;
    alasan: string;
  }>(
    `SELECT baris_mentah, alasan
       FROM etl_error
      WHERE source_id = 'SRC-01'
        AND baris_mentah->>'kode_rup' = ANY($1::text[])
      ORDER BY baris_mentah->>'kolom_tambahan'`,
    [['TEST-RUP-DUP', 'TEST-RUP-BAD-YEAR']],
  );
  const source = await pool.query<{ row_count: number }>(
    `SELECT row_count FROM sumber_data WHERE source_id = 'SRC-01'`,
  );

  assert.equal(result.status, 'partial');
  assert.equal(result.total_rows, 3);
  assert.equal(result.accepted, 1);
  assert.equal(result.rejected, 2);
  assert.equal(project.rows[0].nama, 'Proyek Pertama');
  assert.equal(project.rows[0].source_url, TEST_URL);
  assert.equal(errors.rows.length, 2);
  assert.ok(errors.rows.some((row) => row.alasan === 'kode_rup duplikat dalam file'));
  assert.ok(errors.rows.some((row) => row.alasan === 'tahun_anggaran wajib diisi'));
  assert.equal(errors.rows.find((row) => row.baris_mentah.kolom_tambahan === 'beta')?.baris_mentah.nama_paket, 'Proyek Duplikat');
  assert.equal(errors.rows.find((row) => row.baris_mentah.kolom_tambahan === 'gamma')?.baris_mentah.kode_tender, 'TEST-TENDER-BAD');
  assert.equal(source.rows[0].row_count, 1);
});

test('runner: upsert tidak menimpa match_status, skor, dan kategori', async () => {
  const bpsRes = await pool.query<{ kode_bps: string }>('SELECT kode_bps FROM wilayah LIMIT 1');
  const kodeBps = bpsRes.rows[0]?.kode_bps ?? '1871';
  await pool.query(
    `INSERT INTO proyek (
       kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran, pagu,
       source_id, source_url, fetched_at, match_status, skor_total, kategori
     ) VALUES (
       'TEST-RUP-PRESERVE', 'TEST-TENDER-PRESERVE', 'Nama Lama', 'Dinas Lama', $1,
       2025, 1000, 'SRC-01', $2, now(), 'matched', 42, 'Perlu Perhatian'
     )`,
    [kodeBps, TEST_URL],
  );
  const csv =
    'kode_rup,kode_tender,nama_paket,satker,kode_bps,tahun_anggaran,pagu\n' +
    `TEST-RUP-PRESERVE,TEST-TENDER-PRESERVE,Nama Baru,Dinas Baru,${kodeBps},2026,2000`;

  await runEtl('SRC-01', csv, TEST_URL);
  const result = await pool.query<{
    nama: string;
    match_status: string;
    skor_total: string;
    kategori: string;
  }>(
    `SELECT nama, match_status, skor_total, kategori FROM proyek WHERE kode_rup = 'TEST-RUP-PRESERVE'`,
  );
  assert.equal(result.rows[0].nama, 'Nama Baru');
  assert.equal(result.rows[0].match_status, 'matched');
  assert.equal(result.rows[0].skor_total, '42');
  assert.equal(result.rows[0].kategori, 'Perlu Perhatian');
});

test('runner: kode_tender unik lintas sumber menghasilkan auto-match dan relasi', async () => {
  const bpsRes = await pool.query<{ kode_bps: string }>('SELECT kode_bps FROM wilayah LIMIT 1');
  const kodeBps = bpsRes.rows[0]?.kode_bps ?? '1871';
  await pool.query(
    `INSERT INTO proyek (
       kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran, pagu,
       source_id, source_url, fetched_at, match_status
     ) VALUES (
       'TEST-RUP-AUTO-EXISTING', 'TEST-TENDER-AUTO-UNIQUE', 'Proyek Sumber Pembanding',
       'Dinas Test', $1, 2025, 1000, 'SRC-06', $2, now(), 'unmatched'
     )`,
    [kodeBps, TEST_URL],
  );
  const csv =
    'kode_rup,kode_tender,nama_paket,satker,kode_bps,tahun_anggaran,pagu\n' +
    `TEST-RUP-AUTO-NEW,TEST-TENDER-AUTO-UNIQUE,Proyek Sumber Baru,Dinas Test,${kodeBps},2025,1000`;

  await runEtl('SRC-01', csv, TEST_URL);
  const statuses = await pool.query<{ match_status: string }>(
    `SELECT match_status FROM proyek
      WHERE kode_rup = ANY($1::text[]) ORDER BY kode_rup`,
    [['TEST-RUP-AUTO-EXISTING', 'TEST-RUP-AUTO-NEW']],
  );
  const pair = await pool.query<{ keputusan: string }>(
    `SELECT pair.keputusan
       FROM proyek_pencocokan pair
       JOIN proyek first ON first.id = pair.proyek_id
       JOIN proyek second ON second.id = pair.pasangan_id
      WHERE first.kode_rup LIKE 'TEST-RUP-AUTO-%'
        AND second.kode_rup LIKE 'TEST-RUP-AUTO-%'`,
  );

  assert.deepEqual(statuses.rows.map((row) => row.match_status), ['matched', 'matched']);
  assert.equal(pair.rows.length, 1);
  assert.equal(pair.rows[0].keputusan, 'matched');
});

test('runner: kandidat auto-match ambigu dibiarkan unmatched', async () => {
  const bpsRes = await pool.query<{ kode_bps: string }>('SELECT kode_bps FROM wilayah LIMIT 1');
  const kodeBps = bpsRes.rows[0]?.kode_bps ?? '1871';
  for (const [code, source] of [
    ['TEST-RUP-AMBIG-A', 'SRC-05'],
    ['TEST-RUP-AMBIG-B', 'SRC-06'],
  ]) {
    await pool.query(
      `INSERT INTO proyek (
         kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran, pagu,
         source_id, source_url, fetched_at, match_status
       ) VALUES ($1, 'TEST-TENDER-AMBIG', 'Proyek Ambigu', 'Dinas Test', $2, 2025, 1000,
                 $3, $4, now(), 'unmatched')`,
      [code, kodeBps, source, TEST_URL],
    );
  }
  const csv =
    'kode_rup,kode_tender,nama_paket,satker,kode_bps,tahun_anggaran,pagu\n' +
    `TEST-RUP-AMBIG-NEW,TEST-TENDER-AMBIG,Proyek Baru,Dinas Test,${kodeBps},2025,1000`;

  await runEtl('SRC-01', csv, TEST_URL);
  const project = await pool.query<{ match_status: string }>(
    `SELECT match_status FROM proyek WHERE kode_rup = 'TEST-RUP-AMBIG-NEW'`,
  );
  const pairs = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count
       FROM proyek_pencocokan pair
       JOIN proyek project ON project.id = pair.proyek_id OR project.id = pair.pasangan_id
      WHERE project.kode_rup = 'TEST-RUP-AMBIG-NEW'`,
  );
  assert.equal(project.rows[0].match_status, 'unmatched');
  assert.equal(pairs.rows[0].count, '0');
});

test('runner: source_id atau source_url tidak valid melempar HttpError 400', async () => {
  await assert.rejects(runEtl('SRC-XX', 'kode_rup,nama_paket\nRUP1,A', TEST_URL), (err: unknown) => {
    assert.ok(err instanceof HttpError);
    assert.equal(err.status, 400);
    return true;
  });
  await assert.rejects(runEtl('SRC-01', 'kode_rup,nama_paket\nRUP1,A', 'file:///tmp/data.csv'), (err: unknown) => {
    assert.ok(err instanceof HttpError);
    assert.equal(err.status, 400);
    return true;
  });
});

test('boleh_otomatis=false: tanpa csvContent melempar HttpError 403', async () => {
  await assert.rejects(
    runEtl('SRC-01'),
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 403);
      assert.match(err.message, /tidak mengizinkan pengambilan otomatis/);
      return true;
    },
  );
});

test('boleh_otomatis=false: dengan csvContent berhasil (impor manual diizinkan)', async () => {
  const csv = 'kode_rup,nama_paket,tahun_anggaran,pagu,kode_bps\nTEST-RUP-MANUAL-01,Test Manual Import,2026,1000000,1871\n';
  const result = await runEtl('SRC-01', csv, TEST_URL);
  assert.equal(result.accepted, 1);
  assert.equal(result.rejected, 0);
});

test('advisory lock: dua run paralel — salah satu dapat 409', async () => {
  const csv = 'kode_rup,nama_paket,tahun_anggaran,pagu,kode_bps\nTEST-RUP-LOCK-01,Test Lock,2026,1000000,1871\n';
  const results = await Promise.allSettled([
    runEtl('SRC-01', csv, TEST_URL),
    runEtl('SRC-01', csv, TEST_URL),
  ]);
  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');
  assert.equal(fulfilled.length + rejected.length, 2);
});
