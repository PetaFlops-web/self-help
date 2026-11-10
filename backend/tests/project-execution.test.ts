import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateRabItemSchema,
  UpdateRabItemSchema,
  CreatePaymentSchema,
  UpdatePaymentSchema,
  CreateProgressSchema,
  UpdateProgressSchema,
} from '../src/utils/validators/project-execution.js';
import {
  createRabItem,
  updateRabItemById,
  deleteRabItemById,
} from '../src/services/rab-items.js';
import {
  createPayment,
  updatePaymentById,
  deletePaymentById,
} from '../src/services/financials.js';
import {
  createProgress,
  updateProgressById,
  deleteProgressById,
} from '../src/services/progress.js';
import { HttpError } from '../src/helpers/http.js';
import pool from '../src/config/database.js';

const TEST_KODE_RUP = 'TEST-EXEC-RUP-2026';
let testProjectId = '';

before(async () => {
  await pool.query('DELETE FROM indikator_temuan WHERE proyek_id IN (SELECT id FROM proyek WHERE kode_rup = $1)', [TEST_KODE_RUP]);
  await pool.query('DELETE FROM rab_item WHERE proyek_id IN (SELECT id FROM proyek WHERE kode_rup = $1)', [TEST_KODE_RUP]);
  await pool.query('DELETE FROM pembayaran WHERE proyek_id IN (SELECT id FROM proyek WHERE kode_rup = $1)', [TEST_KODE_RUP]);
  await pool.query('DELETE FROM progres WHERE proyek_id IN (SELECT id FROM proyek WHERE kode_rup = $1)', [TEST_KODE_RUP]);
  await pool.query('DELETE FROM proyek WHERE kode_rup = $1', [TEST_KODE_RUP]);
  const res = await pool.query(
    `INSERT INTO proyek (
        nama, dinas, kode_bps, tahun_anggaran, pagu, hps, nilai_kontrak,
        kode_rup, asal_data, is_dummy
      ) VALUES (
        'Proyek Uji Eksekusi Manual', 'Dinas PUPR', '1871', 2026,
        1000000000, 950000000, 900000000, $1, 'manual_admin', false
      ) RETURNING id`,
    [TEST_KODE_RUP],
  );
  testProjectId = res.rows[0].id;
});

after(async () => {
  if (testProjectId) {
    await pool.query('DELETE FROM indikator_temuan WHERE proyek_id = $1', [testProjectId]);
    await pool.query('DELETE FROM rab_item WHERE proyek_id = $1', [testProjectId]);
    await pool.query('DELETE FROM pembayaran WHERE proyek_id = $1', [testProjectId]);
    await pool.query('DELETE FROM progres WHERE proyek_id = $1', [testProjectId]);
    await pool.query('DELETE FROM proyek WHERE id = $1', [testProjectId]);
  }
});

test('validator: CreateRabItemSchema menolak volume <= 0 dan harga_satuan <= 0', () => {
  const r1 = CreateRabItemSchema.safeParse({
    uraian: 'Pasir Urug',
    satuan: 'm3',
    volume: 0,
    harga_satuan: 150000,
  });
  assert.equal(r1.success, false);

  const r2 = CreateRabItemSchema.safeParse({
    uraian: 'Pasir Urug',
    satuan: 'm3',
    volume: 10,
    harga_satuan: -5000,
  });
  assert.equal(r2.success, false);

  const r3 = CreateRabItemSchema.safeParse({
    uraian: 'OK',
    satuan: 'm3',
    volume: 10,
    harga_satuan: 10000,
  });
  assert.equal(r3.success, false);

  const r4 = CreateRabItemSchema.safeParse({
    uraian: 'Pasir Pasang Berkualitas',
    satuan: 'm3',
    volume: 15.5,
    harga_satuan: 220000,
  });
  assert.equal(r4.success, true);
});

test('validator: CreatePaymentSchema menolak termin_ke = 0 dan tanggal salah', () => {
  const r1 = CreatePaymentSchema.safeParse({
    termin_ke: 0,
    tanggal: '2026-05-01',
    jumlah: 1000000,
    persen_kontrak: 10,
  });
  assert.equal(r1.success, false);

  const r2 = CreatePaymentSchema.safeParse({
    termin_ke: 1,
    tanggal: '01-05-2026',
    jumlah: 1000000,
    persen_kontrak: 10,
  });
  assert.equal(r2.success, false);

  const r3 = CreatePaymentSchema.safeParse({
    termin_ke: 1,
    tanggal: '2026-05-01',
    jumlah: 1000000,
    persen_kontrak: 150,
  });
  assert.equal(r3.success, false);

  const r4 = CreatePaymentSchema.safeParse({
    termin_ke: 1,
    tanggal: '2026-05-01',
    jumlah: 100000000,
    persen_kontrak: 11.11,
  });
  assert.equal(r4.success, true);
});

test('validator: CreateProgressSchema menolak persen_fisik > 100', () => {
  const r1 = CreateProgressSchema.safeParse({
    tanggal: '2026-05-01',
    persen_fisik: 105,
  });
  assert.equal(r1.success, false);

  const r2 = CreateProgressSchema.safeParse({
    tanggal: '2026-05-01',
    persen_fisik: 45.75,
  });
  assert.equal(r2.success, true);
});

test('CRUD RAB Item: alur insert -> update -> delete dengan kalkulasi skor reaktif', async () => {
  const resCreate = await createRabItem(testProjectId, {
    uraian: 'Semen Portland Komposit',
    satuan: 'sak',
    volume: 200,
    harga_satuan: 75000,
  });

  assert.ok(resCreate.rab_item.id);
  assert.equal(resCreate.rab_item.is_dummy, false);
  assert.equal(resCreate.rab_item.uraian, 'Semen Portland Komposit');
  assert.ok(resCreate.scoring);
  assert.equal(typeof resCreate.scoring.skor_total, 'number');

  const rabId = resCreate.rab_item.id;

  const resUpdate = await updateRabItemById(rabId, {
    volume: 250,
    harga_satuan: 80000,
  });

  assert.equal(Number(resUpdate.rab_item.volume), 250);
  assert.equal(Number(resUpdate.rab_item.harga_satuan), 80000);
  assert.ok(resUpdate.scoring);

  const resDelete = await deleteRabItemById(rabId);
  assert.equal(resDelete.deleted.id, rabId);
  assert.ok(resDelete.scoring);

  await assert.rejects(
    async () => {
      await updateRabItemById(rabId, { volume: 300 });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 404);
      return true;
    },
  );
});

test('CRUD Pembayaran: alur create -> update -> delete dengan rekalkulasi skor', async () => {
  const resCreate = await createPayment(testProjectId, {
    termin_ke: 1,
    tanggal: '2026-06-01',
    jumlah: 225000000,
    persen_kontrak: 25,
  });

  assert.ok(resCreate.pembayaran.id);
  assert.equal(resCreate.pembayaran.is_dummy, false);
  assert.equal(resCreate.pembayaran.termin_ke, 1);
  assert.ok(resCreate.scoring);

  const paymentId = resCreate.pembayaran.id;

  const resUpdate = await updatePaymentById(paymentId, {
    persen_kontrak: 30,
  });

  assert.equal(Number(resUpdate.pembayaran.persen_kontrak), 30);

  const resDelete = await deletePaymentById(paymentId);
  assert.equal(resDelete.deleted.id, paymentId);
  assert.ok(resDelete.scoring);

  await assert.rejects(
    async () => {
      await deletePaymentById(paymentId);
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 404);
      return true;
    },
  );
});

test('CRUD Progres Fisik: alur create -> update -> delete mematok sumber verifikator', async () => {
  const resCreate = await createProgress(testProjectId, {
    tanggal: '2026-06-15',
    persen_fisik: 28.5,
  });

  assert.ok(resCreate.progres.id);
  assert.equal(resCreate.progres.is_dummy, false);
  assert.equal(resCreate.progres.sumber, 'verifikator');
  assert.equal(Number(resCreate.progres.persen_fisik), 28.5);
  assert.ok(resCreate.scoring);

  const progressId = resCreate.progres.id;

  const resUpdate = await updateProgressById(progressId, {
    persen_fisik: 32.0,
  });

  assert.equal(Number(resUpdate.progres.persen_fisik), 32.0);

  const resDelete = await deleteProgressById(progressId);
  assert.equal(resDelete.deleted.id, progressId);
  assert.ok(resDelete.scoring);

  await assert.rejects(
    async () => {
      await deleteProgressById(progressId);
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 404);
      return true;
    },
  );
});

test('error handling: UUID tidak valid melempar HttpError 400', async () => {
  await assert.rejects(
    async () => {
      await createRabItem('bukan-uuid', {
        uraian: 'Test Item',
        satuan: 'unit',
        volume: 1,
        harga_satuan: 1000,
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await createPayment('bukan-uuid', {
        termin_ke: 1,
        tanggal: '2026-01-01',
        jumlah: 1000,
        persen_kontrak: 1,
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await createProgress('bukan-uuid', {
        tanggal: '2026-01-01',
        persen_fisik: 1,
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    },
  );
});
