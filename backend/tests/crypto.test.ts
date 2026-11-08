import { test } from 'node:test';
import assert from 'node:assert/strict';

// Set ENCRYPTION_KEY before importing the module
process.env.ENCRYPTION_KEY = 'clearsight-dev-encryption-key-test-32-chars!!';

const { encryptField, decryptField } = await import('../src/helpers/crypto.js');

test('decryptField(encryptField(x)) === x untuk teks biasa', () => {
  const plaintext = 'Budi Santoso';
  const encrypted = encryptField(plaintext);
  assert.ok(encrypted !== null);
  assert.equal(decryptField(encrypted), plaintext);
});

test('dua pemanggilan encryptField pada nilai sama menghasilkan ciphertext berbeda (IV acak)', () => {
  const plaintext = '081234567890';
  const a = encryptField(plaintext);
  const b = encryptField(plaintext);
  assert.ok(a !== null && b !== null);
  assert.ok(!a.equals(b), 'ciphertext harus berbeda karena IV acak');
  assert.equal(decryptField(a), plaintext);
  assert.equal(decryptField(b), plaintext);
});

test('encryptField("") mengembalikan null', () => {
  assert.equal(encryptField(''), null);
  assert.equal(encryptField(null), null);
  assert.equal(encryptField(undefined), null);
});

test('decryptField(null) mengembalikan null', () => {
  assert.equal(decryptField(null), null);
  assert.equal(decryptField(undefined), null);
});

test('karakter unicode (nama Indonesia) terenkripsi dan terdekripsi dengan benar', () => {
  const plaintext = 'Sutrisno Hidayat';
  const encrypted = encryptField(plaintext);
  assert.equal(decryptField(encrypted), plaintext);
});
