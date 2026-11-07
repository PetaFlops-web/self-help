import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import jwtLib from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { loginUser, getCurrentUserProfile } from '../src/services/auth.js';
import { signToken, verifyToken } from '../src/helpers/jwt.js';
import { requireAuth } from '../src/middlewares/auth.js';
import { HttpError } from '../src/helpers/http.js';
import pool from '../src/config/database.js';

const TEST_SURELS = ['nonaktif@clearsight.id', 'downgrade@clearsight.id'];

after(async () => {
  await pool.query(
    `DELETE FROM pengguna WHERE surel = ANY($1::text[])`,
    [TEST_SURELS],
  );
});

test('auth service: login dengan kredensial benar mengembalikan token dan data pengguna', async () => {
  const result = await loginUser({
    surel: 'admin@clearsight.id',
    kata_sandi: process.env.ADMIN_PASSWORD || 'AdminClearsight2026!',
  });

  assert.ok(result.token);
  assert.equal(typeof result.token, 'string');
  assert.equal(result.pengguna.surel, 'admin@clearsight.id');
  assert.equal(result.pengguna.peran, 'admin');

  const payload = verifyToken(result.token);
  assert.equal(payload.surel, 'admin@clearsight.id');
  assert.equal(payload.peran, 'admin');
  assert.equal(payload.sub, result.pengguna.id);
});

test('auth service: login dengan kata sandi salah melempar HttpError 401', async () => {
  await assert.rejects(
    async () => {
      await loginUser({
        surel: 'admin@clearsight.id',
        kata_sandi: 'KataSandiSalah123!',
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 401);
      assert.equal(err.message, 'Surel atau kata sandi tidak valid');
      return true;
    },
  );
});

test('auth service: login dengan surel tidak terdaftar melempar HttpError 401 dengan pesan yang sama', async () => {
  await assert.rejects(
    async () => {
      await loginUser({
        surel: 'tidak_ada@clearsight.id',
        kata_sandi: 'bebas123',
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 401);
      assert.equal(err.message, 'Surel atau kata sandi tidak valid');
      return true;
    },
  );
});

test('auth service: getCurrentUserProfile mengembalikan profil pengguna terdaftar', async () => {
  const res = await pool.query<{ id: string }>('SELECT id FROM pengguna WHERE surel = $1', ['admin@clearsight.id']);
  const adminId = res.rows[0].id;

  const profile = await getCurrentUserProfile(adminId);
  assert.equal(profile.id, adminId);
  assert.equal(profile.surel, 'admin@clearsight.id');
  assert.equal(profile.peran, 'admin');
});

test('requireAuth: menolak token dari user yang tidak ada di database dengan 401', async () => {
  const ghostToken = signToken({
    sub: '00000000-0000-4000-8000-000000000999',
    surel: 'ghost@clearsight.id',
    peran: 'admin',
    nama: 'Ghost User',
  });

  const req = {
    headers: {
      authorization: `Bearer ${ghostToken}`,
    },
  } as unknown as Request;

  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  await assert.rejects(
    async () => {
      await requireAuth(req, {} as Response, next);
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 401);
      assert.equal(err.message, 'Pengguna tidak ditemukan atau telah dinonaktifkan');
      return true;
    },
  );

  assert.equal(nextCalled, false);
});

test('requireAuth: menolak token dari user non-aktif dengan 401', async () => {
  const insertRes = await pool.query<{ id: string }>(
    `INSERT INTO pengguna (nama, surel, kata_sandi_hash, peran, aktif)
     VALUES ('Nonaktif Test', 'nonaktif@clearsight.id', 'dummy_hash', 'verifikator', false)
     ON CONFLICT (surel) DO UPDATE SET aktif = false
     RETURNING id`,
  );
  const inactiveId = insertRes.rows[0].id;

  const token = signToken({
    sub: inactiveId,
    surel: 'nonaktif@clearsight.id',
    peran: 'verifikator',
    nama: 'Nonaktif Test',
  });

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  } as unknown as Request;

  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  await assert.rejects(
    async () => {
      await requireAuth(req, {} as Response, next);
    },
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 401);
      assert.equal(err.message, 'Pengguna tidak ditemukan atau telah dinonaktifkan');
      return true;
    },
  );

  assert.equal(nextCalled, false);
});

test('requireAuth: mengisi req.user dengan role terbaru dari database meskipun payload token lama', async () => {
  const insertRes = await pool.query<{ id: string }>(
    `INSERT INTO pengguna (nama, surel, kata_sandi_hash, peran, aktif)
     VALUES ('Downgraded User', 'downgrade@clearsight.id', 'dummy_hash', 'peninjau', true)
     ON CONFLICT (surel) DO UPDATE SET peran = 'peninjau', aktif = true
     RETURNING id`,
  );
  const userId = insertRes.rows[0].id;

  const oldAdminToken = signToken({
    sub: userId,
    surel: 'downgrade@clearsight.id',
    peran: 'admin',
    nama: 'Downgraded User',
  });

  const req = {
    headers: {
      authorization: `Bearer ${oldAdminToken}`,
    },
  } as unknown as Request;

  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  await requireAuth(req, {} as Response, next);

  assert.equal(nextCalled, true);
  assert.ok(req.user);
  assert.equal(req.user.id, userId);
  assert.equal(req.user.peran, 'peninjau');
});

test('verifyToken: menolak token dengan algoritma "none" (algorithm confusion)', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: '11111111-0000-4000-8000-000000000001',
    surel: 'admin@clearsight.id',
    peran: 'admin',
    nama: 'Attacker',
  })).toString('base64url');
  const noneToken = `${header}.${payload}.`;

  assert.throws(
    () => verifyToken(noneToken),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

test('verifyToken: menolak token dengan payload tidak lengkap (field sub hilang)', () => {
  const incompleteToken = jwtLib.sign(
    { surel: 'admin@clearsight.id', peran: 'admin', nama: 'Test' },
    process.env.JWT_SECRET || 'clearsight-dev-jwt-secret-replace-in-production-1234567890',
    { algorithm: 'HS256', expiresIn: '1h' },
  );

  assert.throws(
    () => verifyToken(incompleteToken),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /sub/);
      return true;
    },
  );
});

test('verifyToken: menolak token dengan peran tidak valid', () => {
  const badRoleToken = jwtLib.sign(
    { sub: '11111111-0000-4000-8000-000000000001', surel: 'admin@clearsight.id', peran: 'superuser', nama: 'Attacker' },
    process.env.JWT_SECRET || 'clearsight-dev-jwt-secret-replace-in-production-1234567890',
    { algorithm: 'HS256', expiresIn: '1h' },
  );

  assert.throws(
    () => verifyToken(badRoleToken),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /peran/);
      return true;
    },
  );
});
