import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../src/helpers/http.js';
import {
  verifyReportByTiket,
  listAdminReports,
  getAdminReport,
  forwardReportByTiket,
} from '../src/services/admin-reports.js';
import {
  createReport,
  getReportByTiket,
} from '../src/repositories/citizen-report.js';
import { recalculateProjectScore } from '../src/services/project-scoring.js';
import pool from '../src/config/database.js';

const TEST_PROYEK_ID = '11111111-0000-4000-8000-000000000001';
const TEST_TIKETS: string[] = [];

after(async () => {
  if (TEST_TIKETS.length > 0) {
    await pool.query('DELETE FROM laporan_warga WHERE tiket = ANY($1::text[])', [TEST_TIKETS]);
    await recalculateProjectScore(pool, TEST_PROYEK_ID);
  }
});

async function createTestReport(): Promise<string> {
  const report = await createReport({
    proyek_id: TEST_PROYEK_ID,
    kategori: 'fund_flow',
    keterangan: 'Test report for transition testing',
  });
  TEST_TIKETS.push(report.tiket);
  return report.tiket;
}

test('transisi: Dilaporkan → Diverifikasi → Diteruskan → Ditindaklanjuti → Selesai (alur lengkap)', async () => {
  const tiket = await createTestReport();

  const r1 = await verifyReportByTiket(tiket, { status: 'Diverifikasi' });
  assert.equal(r1.previousStatus, 'Dilaporkan');
  assert.equal(r1.report.status, 'Diverifikasi');

  const r2 = await forwardReportByTiket(tiket, 'inspektorat');
  assert.equal(r2.previousStatus, 'Diverifikasi');
  assert.equal(r2.report.status, 'Diteruskan');
  assert.equal(r2.report.lembaga_tujuan, 'inspektorat');
  assert.ok(r2.report.diteruskan_pada);

  const r3 = await verifyReportByTiket(tiket, { status: 'Ditindaklanjuti' });
  assert.equal(r3.previousStatus, 'Diteruskan');
  assert.equal(r3.report.status, 'Ditindaklanjuti');

  const r4 = await verifyReportByTiket(tiket, { status: 'Selesai' });
  assert.equal(r4.previousStatus, 'Ditindaklanjuti');
  assert.equal(r4.report.status, 'Selesai');
});

test('transisi tidak sah: Dilaporkan → Selesai melempar HttpError 400', async () => {
  const tiket = await createTestReport();

  await assert.rejects(
    async () => {
      await verifyReportByTiket(tiket, { status: 'Selesai' });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      assert.match(err.message, /tidak sah/);
      return true;
    },
  );
});

test('regresi COALESCE: catatan_verifikator tidak terhapus saat transisi tanpa catatan', async () => {
  const tiket = await createTestReport();

  await verifyReportByTiket(tiket, {
    status: 'Diverifikasi',
    catatan_verifikator: 'CATATAN PENTING DARI VERIFIKATOR',
  });

  await forwardReportByTiket(tiket, 'inspektorat');

  const r1 = await verifyReportByTiket(tiket, { status: 'Ditindaklanjuti' });
  assert.equal(r1.report.catatan_verifikator, 'CATATAN PENTING DARI VERIFIKATOR');

  const r2 = await verifyReportByTiket(tiket, { status: 'Selesai' });
  assert.equal(r2.report.catatan_verifikator, 'CATATAN PENTING DARI VERIFIKATOR');
});

test('transisi tidak sah: Diteruskan → Diverifikasi melempar HttpError 400', async () => {
  const tiket = await createTestReport();
  await verifyReportByTiket(tiket, { status: 'Diverifikasi' });
  await forwardReportByTiket(tiket, 'BPK');

  await assert.rejects(
    async () => {
      await verifyReportByTiket(tiket, { status: 'Diverifikasi' });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    },
  );
});

test('regresi Fase 12.4: Ditolak tanpa alasan_tolak melempar HttpError 400', async () => {
  const tiket = await createTestReport();

  await assert.rejects(
    async () => {
      await verifyReportByTiket(tiket, { status: 'Ditolak' });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      assert.match(err.message, /alasan_tolak/);
      return true;
    },
  );
});

test('forward dari status Dilaporkan melempar HttpError 400', async () => {
  const tiket = await createTestReport();

  await assert.rejects(
    async () => {
      await forwardReportByTiket(tiket, 'KPK');
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    },
  );
});

test('admin list: listAdminReports mengembalikan baris dengan total_by_status', async () => {
  const result = await listAdminReports({});

  assert.ok(Array.isArray(result.rows));
  assert.equal(typeof result.total, 'number');
  assert.ok(result.total >= 1);
  assert.ok(result.totalByStatus);
  assert.equal(typeof result.totalByStatus, 'object');
});

test('admin list: filter status membatasi hasil', async () => {
  const result = await listAdminReports({ status: 'Selesai' });

  assert.ok(Array.isArray(result.rows));
  for (const row of result.rows) {
    assert.equal(row.status, 'Selesai');
  }
});

test('admin detail: getAdminReport mengembalikan catatan_verifikator dan field internal', async () => {
  const existing = await pool.query<{ tiket: string }>(
    "SELECT tiket FROM laporan_warga WHERE status = 'Diverifikasi' LIMIT 1",
  );
  assert.ok(existing.rows.length > 0, 'harus ada laporan Diverifikasi');

  const report = await getAdminReport(existing.rows[0].tiket);
  assert.equal(report.tiket, existing.rows[0].tiket);
  assert.ok(report.catatan_verifikator !== undefined);
  assert.ok(report.foto_urls !== undefined);
  assert.ok(report.lat !== undefined);
  assert.ok(report.anonim !== undefined);
});

test('endpoint publik: getReportByTiket menyembunyikan keterangan untuk status Dilaporkan', async () => {
  const tiket = await createTestReport();

  const pub = await getReportByTiket(tiket);
  assert.ok(pub);
  assert.equal(pub!.status, 'Dilaporkan');
  assert.equal(pub!.keterangan, null);
});

test('limit validasi: limit=abc melempar HttpError 400', async () => {
  await assert.rejects(
    async () => {
      await listAdminReports({ limit: 'abc' });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    },
  );
});
