import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/helpers/password.js';

test('password helper: hashPassword menghasilkan hash yang berbeda dari teks asli', async () => {
  const plain = 'RahasiaSuper123!';
  const hash = await hashPassword(plain);

  assert.notEqual(hash, plain);
  assert.equal(typeof hash, 'string');
  assert.ok(hash.startsWith('$2'));
});

test('password helper: verifyPassword mengembalikan true untuk kata sandi benar dan false untuk kata sandi salah', async () => {
  const plain = 'RahasiaSuper123!';
  const hash = await hashPassword(plain);

  const isCorrect = await verifyPassword(plain, hash);
  assert.equal(isCorrect, true);

  const isWrong = await verifyPassword('SalahSandi999', hash);
  assert.equal(isWrong, false);
});
