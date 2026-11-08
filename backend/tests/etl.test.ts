import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { validateProjectRow } from '../src/services/etl/validator.js';
import { parseSiRUPCsv } from '../src/services/etl/sirup-parser.js';
import { runEtl } from '../src/services/etl/runner.js';
import { HttpError } from '../src/helpers/http.js';
import pool from '../src/config/database.js';

const VALID_BPS = new Set(['1871']);

after(async () => {
  await pool.query("DELETE FROM proyek WHERE kode_rup LIKE 'TEST-RUP-%'");
  await pool.query("DELETE FROM etl_error WHERE source_id = 'SRC-01' AND alasan LIKE '%test%'");
  await pool.end();
});

test('validator: baris valid mengembalikan ok', () => {
  const result = validateProjectRow(
    {
      kode_rup: 'TEST-RUP-VALID',
      nama: 'Proyek Test Valid',
      dinas: 'Dinas Test',
      kode_bps: '1871',
      tahun_anggaran: '2025',
      pagu: '1000000000',
      hps: '900000000',
      sumber_dana: 'APBD',
      metode_pemilihan: 'Tender',
      pengumuman_rup_tgl: '2025-01-15',
    },
    VALID_BPS,
  );
  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail('validasi seharusnya lolos');
  }
  assert.equal(result.data.kode_rup, 'TEST-RUP-VALID');
  assert.equal(result.data.nama, 'Proyek Test Valid');
  assert.equal(result.data.tahun_anggaran, 2025);
  assert.equal(result.data.pagu, '1000000000');
  assert.equal(result.data.hps, '900000000');
});

test('validator: HPS negatif gagal dengan alasan spesifik', () => {
  const result = validateProjectRow(
    {
      kode_rup: 'TEST-RUP-HPS',
      nama: 'Proyek Test HPS',
      dinas: 'Dinas Test',
      kode_bps: '1871',
      tahun_anggaran: '2025',
      pagu: '1000000000',
      hps: '-100',
      sumber_dana: 'APBD',
      metode_pemilihan: 'Tender',
      pengumuman_rup_tgl: '2025-01-15',
    },
    VALID_BPS,
  );
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('validasi seharusnya gagal');
  }
  assert.match(result.reason, /hps/);
});

test('validator: kode_bps tidak terdaftar di wilayah gagal', () => {
  const result = validateProjectRow(
    {
      kode_rup: 'TEST-RUP-BPS',
      nama: 'Proyek Test BPS',
      dinas: 'Dinas Test',
      kode_bps: '9999',
      tahun_anggaran: '2025',
      pagu: '1000000000',
      hps: '',
      sumber_dana: 'APBD',
      metode_pemilihan: 'Tender',
      pengumuman_rup_tgl: '2025-01-15',
    },
    VALID_BPS,
  );
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('validasi seharusnya gagal');
  }
  assert.match(result.reason, /kode_bps/);
});

test('validator: tahun_anggaran non-integer gagal', () => {
  const result = validateProjectRow(
    {
      kode_rup: 'TEST-RUP-TAHUN',
      nama: 'Proyek Test Tahun',
      dinas: 'Dinas Test',
      kode_bps: '1871',
      tahun_anggaran: '2025.5',
      pagu: '1000000000',
      hps: '',
      sumber_dana: 'APBD',
      metode_pemilihan: 'Tender',
      pengumuman_rup_tgl: '2025-01-15',
    },
    VALID_BPS,
  );
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('validasi seharusnya gagal');
  }
  assert.match(result.reason, /tahun_anggaran/);
});

test('validator: kode_rup kosong gagal', () => {
  const result = validateProjectRow(
    {
      kode_rup: '',
      nama: 'Proyek Test Kosong',
      dinas: 'Dinas Test',
      kode_bps: '1871',
      tahun_anggaran: '2025',
      pagu: '1000000000',
      hps: '',
      sumber_dana: 'APBD',
      metode_pemilihan: 'Tender',
      pengumuman_rup_tgl: '2025-01-15',
    },
    VALID_BPS,
  );
  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail('validasi seharusnya gagal');
  }
  assert.match(result.reason, /kode_rup/);
});

test('CSV parser: CSV sederhana menghasilkan baris yang benar', () => {
  const csv = 'kode_rup,nama_paket,pagu\nRUP1,Proyek A,1000000\nRUP2,Proyek B,2000000';
  const rows = parseSiRUPCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].kode_rup, 'RUP1');
  assert.equal(rows[0].nama, 'Proyek A');
  assert.equal(rows[0].pagu, '1000000');
  assert.equal(rows[1].kode_rup, 'RUP2');
  assert.equal(rows[1].nama, 'Proyek B');
  assert.equal(rows[1].pagu, '2000000');
});

test('CSV parser: field berpetik dengan koma dan baris baru', () => {
  const csv =
    'kode_rup,nama_paket,pagu\n"RUP1","Proyek, Khusus","1000000"\n"RUP2","Proyek\nMulti Baris","2000000"';
  const rows = parseSiRUPCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].kode_rup, 'RUP1');
  assert.equal(rows[0].nama, 'Proyek, Khusus');
  assert.equal(rows[0].pagu, '1000000');
  assert.equal(rows[1].nama, 'Proyek\nMulti Baris');
  assert.equal(rows[1].pagu, '2000000');
});

test('runner: idempoten — jalankan dua kali menghasilkan jumlah proyek sama', async () => {
  const bpsRes = await pool.query<{ kode_bps: string }>('SELECT kode_bps FROM wilayah LIMIT 1');
  const kodeBps = bpsRes.rows[0]?.kode_bps ?? '1871';
  const csv =
    'kode_rup,nama_paket,satker,kode_bps,tahun_anggaran,pagu,hps,sumber_dana,metode_pemilihan,tgl_pembuatan_rup\n' +
    `TEST-RUP-001,Proyek Test Satu,Dinas Test,${kodeBps},2025,1000000000,900000000,APBD,Tender,2025-01-15\n` +
    `TEST-RUP-002,Proyek Test Dua,Dinas Test,${kodeBps},2025,2000000000,,APBD,Pengadaan Langsung,2025-02-20`;

  const r1 = await runEtl('SRC-01', csv);
  const count1 = await pool.query<{ count: string }>(
    "SELECT COUNT(*) AS count FROM proyek WHERE kode_rup LIKE 'TEST-RUP-%'",
  );
  const n1 = parseInt(count1.rows[0].count, 10);

  const r2 = await runEtl('SRC-01', csv);
  const count2 = await pool.query<{ count: string }>(
    "SELECT COUNT(*) AS count FROM proyek WHERE kode_rup LIKE 'TEST-RUP-%'",
  );
  const n2 = parseInt(count2.rows[0].count, 10);

  assert.equal(r1.accepted, 2);
  assert.equal(r2.accepted, 2);
  assert.equal(n1, 2);
  assert.equal(n2, 2);
});

test('runner: source_id tidak didukung melempar HttpError 400', async () => {
  await assert.rejects(
    async () => {
      await runEtl('SRC-XX', 'kode_rup,nama_paket\nRUP1,A');
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    },
  );
});
