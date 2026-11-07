import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../src/helpers/http.js';
import { recordAudit } from '../src/helpers/audit.js';
import { getAuditLogs } from '../src/services/audit.js';
import pool from '../src/config/database.js';

const TEST_AUDIT_AKSIS = ['FAIL_SAFE_TEST', 'TEST_RECORD_AUDIT'];

after(async () => {
  await pool.query(
    `DELETE FROM log_audit WHERE aksi = ANY($1::text[])`,
    [TEST_AUDIT_AKSIS],
  );
});

test('audit fail-safe: recordAudit tidak melempar walau insert gagal', async () => {
  await assert.doesNotReject(
    async () => {
      await recordAudit({
        aktor_id: 'bukan-uuid-valid',
        aktor_nama: 'Test Fail Safe',
        peran: 'admin',
        modul: 'test',
        aksi: 'FAIL_SAFE_TEST',
        target_id: null,
        diff: null,
        ip: null,
      });
    },
  );
});

test('audit recording: recordAudit menulis baris ke log_audit dengan field yang benar', async () => {
  await recordAudit({
    aktor_id: null,
    aktor_nama: 'Test Audit',
    peran: 'admin',
    modul: 'test',
    aksi: 'TEST_RECORD_AUDIT',
    target_id: 'LPR-TEST-001',
    diff: { before: { status: 'Dilaporkan' }, after: { status: 'Diverifikasi' } },
    ip: '127.0.0.1',
  });

  const res = await pool.query(
    "SELECT aktor_nama, peran, modul, aksi, target_id, diff, ip FROM log_audit WHERE aksi = 'TEST_RECORD_AUDIT' ORDER BY waktu DESC LIMIT 1",
  );
  assert.ok(res.rows.length >= 1);
  const row = res.rows[0];
  assert.equal(row.aktor_nama, 'Test Audit');
  assert.equal(row.peran, 'admin');
  assert.equal(row.modul, 'test');
  assert.equal(row.aksi, 'TEST_RECORD_AUDIT');
  assert.equal(row.target_id, 'LPR-TEST-001');
  assert.equal(row.ip, '127.0.0.1');
  assert.deepEqual(row.diff, { before: { status: 'Dilaporkan' }, after: { status: 'Diverifikasi' } });
});

test('audit list: getAuditLogs mengembalikan baris terurut waktu menurun dengan total', async () => {
  const result = await getAuditLogs({ modul: 'test', limit: '10' });

  assert.ok(Array.isArray(result.rows));
  assert.equal(typeof result.total, 'number');
  assert.ok(result.total >= 1);
  assert.equal(result.limit, 10);
});

test('audit list: filter modul membatasi hasil', async () => {
  const result = await getAuditLogs({ modul: 'modul_yang_pasti_tidak_ada', limit: '10' });

  assert.equal(result.rows.length, 0);
  assert.equal(result.total, 0);
});

test('audit list: limit non-angka melempar HttpError 400', async () => {
  await assert.rejects(
    async () => {
      await getAuditLogs({ limit: 'abc' });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      assert.match(err.message, /limit/);
      return true;
    },
  );
});

test('audit list: limit=0 melempar HttpError 400', async () => {
  await assert.rejects(
    async () => {
      await getAuditLogs({ limit: '0' });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    },
  );
});

test('audit list: limit negatif melempar HttpError 400', async () => {
  await assert.rejects(
    async () => {
      await getAuditLogs({ limit: '-5' });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    },
  );
});

test('audit list: limit=999999 di-cap menjadi 100', async () => {
  const result = await getAuditLogs({ limit: '999999' });

  assert.equal(result.limit, 100);
});

test('audit list: offset negatif melempar HttpError 400', async () => {
  await assert.rejects(
    async () => {
      await getAuditLogs({ offset: '-1' });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      assert.match(err.message, /offset/);
      return true;
    },
  );
});
