import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../src/config/database.js';
import { HttpError } from '../src/helpers/http.js';
import { listProjectsPaginatedByFilters } from '../src/services/projects.js';
import { createReport } from '../src/repositories/citizen-report.js';

const RUP_A = 'TEST-FLT-RUP-8821A';
const RUP_B = 'TEST-FLT-RUP-8821B';
const TENDER_A = 'SPSE-FLT-8821A';
const TENDER_B = 'SPSE-FLT-8821B';
const DINAS_UNIQUE = 'Dinas Pengujian Filter FLT8821';

let idA = '';
let idB = '';
let tiketA = '';

async function cleanupFixtures() {
  await pool.query(
    'DELETE FROM laporan_warga WHERE proyek_id IN (SELECT id FROM proyek WHERE kode_rup = ANY($1::text[]))',
    [[RUP_A, RUP_B]],
  );
  await pool.query('DELETE FROM proyek WHERE kode_rup = ANY($1::text[])', [[RUP_A, RUP_B]]);
}

before(async () => {
  await cleanupFixtures();

  const resA = await pool.query<{ id: string }>(
    `INSERT INTO proyek (
        kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran,
        pagu, skor_total, kategori, match_status, asal_data, is_dummy
      ) VALUES (
        $1, $2, 'Proyek Filter Uji Alfa FLT8821', $3, '1871', 2026,
        2500000000, 82, 'Tinggi', 'unmatched', 'manual_admin', false
      ) RETURNING id`,
    [RUP_A, TENDER_A, DINAS_UNIQUE],
  );
  idA = resA.rows[0].id;

  const resB = await pool.query<{ id: string }>(
    `INSERT INTO proyek (
        kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran,
        pagu, skor_total, kategori, match_status, asal_data, is_dummy
      ) VALUES (
        $1, $2, 'Proyek Filter Uji Beta FLT8821', $3, '1871', 2026,
        1500000000, 22, 'Rendah', 'matched', 'manual_admin', true
      ) RETURNING id`,
    [RUP_B, TENDER_B, DINAS_UNIQUE],
  );
  idB = resB.rows[0].id;

  const report = await createReport({
    proyek_id: idA,
    kategori: 'kualitas_fisik',
    keterangan: 'Uji filter laporan menunggu',
  });
  tiketA = report.tiket;
});

after(async () => {
  if (tiketA) {
    await pool.query('DELETE FROM laporan_warga WHERE tiket = $1', [tiketA]);
  }
  await cleanupFixtures();
});

test('pencarian q & alias search mencocokkan nama, dinas, kode_rup, dan kode_tender', async () => {
  const byRup = await listProjectsPaginatedByFilters({ q: RUP_A });
  assert.equal(byRup.total, 1);
  assert.equal(byRup.projects[0]?.id, idA);

  const byTenderAlias = await listProjectsPaginatedByFilters({ search: TENDER_B });
  assert.equal(byTenderAlias.total, 1);
  assert.equal(byTenderAlias.projects[0]?.id, idB);

  const byName = await listProjectsPaginatedByFilters({ search: 'Alfa FLT8821' });
  assert.equal(byName.total, 1);
  assert.equal(byName.projects[0]?.kode_rup, RUP_A);

  const byDinas = await listProjectsPaginatedByFilters({ q: DINAS_UNIQUE });
  assert.equal(byDinas.total, 2);
});

test('paginasi limit & offset mengembalikan irisan terurut tanpa duplikasi dan menjaga total + KPI', async () => {
  const p1 = await listProjectsPaginatedByFilters({ dinas: DINAS_UNIQUE, limit: '1', offset: '0' });
  const p2 = await listProjectsPaginatedByFilters({ dinas: DINAS_UNIQUE, limit: '1', offset: '1' });

  assert.equal(p1.total, 2);
  assert.equal(p2.total, 2);
  assert.equal(p1.limit, 1);
  assert.equal(p1.offset, 0);
  assert.equal(p2.offset, 1);
  assert.equal(p1.projects.length, 1);
  assert.equal(p2.projects.length, 1);
  assert.notEqual(p1.projects[0].id, p2.projects[0].id);
  assert.equal(p1.projects[0].id, idA);
  assert.equal(p2.projects[0].id, idB);
  assert.equal(p1.kpi.total_proyek, 2);
  assert.equal(p1.kpi.total_pagu, 4000000000);
});

test('filter tab kategori & match_status membatasi baris namun KPI tetap lintas tab pada filter aktif', async () => {
  const res = await listProjectsPaginatedByFilters({
    dinas: DINAS_UNIQUE,
    kategori: 'Tinggi',
  });

  assert.equal(res.total, 1);
  assert.equal(res.projects.length, 1);
  assert.equal(res.projects[0].id, idA);
  assert.equal(res.kpi.total_proyek, 2);
  assert.equal(res.kpi.tinggi, 1);
  assert.equal(res.kpi.rendah, 1);
  assert.equal(res.kpi.unmatched, 1);

  const unmatchedRes = await listProjectsPaginatedByFilters({
    dinas: DINAS_UNIQUE,
    match_status: 'unmatched',
  });
  assert.equal(unmatchedRes.total, 1);
  assert.equal(unmatchedRes.projects[0].id, idA);
});

test('filter asal_data (dummy vs manual_admin) dan has_waiting_reports bekerja akurat', async () => {
  const dummyRes = await listProjectsPaginatedByFilters({
    dinas: DINAS_UNIQUE,
    asal_data: 'dummy',
  });
  assert.equal(dummyRes.total, 1);
  assert.equal(dummyRes.projects[0].id, idB);

  const manualRes = await listProjectsPaginatedByFilters({
    dinas: DINAS_UNIQUE,
    asal_data: 'manual_admin',
  });
  assert.equal(manualRes.total, 1);
  assert.equal(manualRes.projects[0].id, idA);

  const waitingRes = await listProjectsPaginatedByFilters({
    dinas: DINAS_UNIQUE,
    has_waiting_reports: 'true',
  });
  assert.equal(waitingRes.total, 1);
  assert.equal(waitingRes.projects[0].id, idA);
  assert.ok((waitingRes.projects[0].laporan_menunggu ?? 0) >= 1);
});

test('validasi query menolak offset negatif dan has_waiting_reports non-boolean dengan HttpError 400', async () => {
  await assert.rejects(
    () => listProjectsPaginatedByFilters({ offset: '-1' }),
    (err: unknown) => err instanceof HttpError && err.status === 400,
  );

  await assert.rejects(
    () => listProjectsPaginatedByFilters({ has_waiting_reports: 'bukan_bool' }),
    (err: unknown) => err instanceof HttpError && err.status === 400,
  );
});
