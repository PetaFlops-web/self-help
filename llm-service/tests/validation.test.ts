import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateOutput,
  ValidationError,
  collectNumbers,
  findUnknownNumbers,
} from '../src/services/validation.js';

const allowedCodes = new Set(['D2-01', 'D4-01']);
const allowedNumbers = new Set(['89', '1', '35', '30', '100', '10', '2026']);

function validRaw(): string {
  return JSON.stringify({
    ringkasan: 'Skor risiko 89 (Tinggi). Indikator untuk diperiksa, bukan bukti pelanggaran.',
    temuan: [
      {
        kode_aturan: 'D2-01',
        penjelasan: 'Hanya satu penawar (nilai 1, ambang tinggi 1).',
        arti_bagi_warga: 'Persaingan harga terbatas, perlu diperiksa.',
      },
      {
        kode_aturan: 'D4-01',
        penjelasan: 'Pencairan melebihi progres (nilai 35, ambang 30).',
        arti_bagi_warga: 'Perlu diperiksa kewajaran pencairan.',
      },
    ],
    keterbatasan: ['Dimensi D1 dan D5 belum dinilai karena data belum cukup.'],
    saran_tindak_lanjut: [{ langkah: 'Minta dokumen pendukung.', lembaga: 'dinas_terkait' }],
    penafian: 'Ini indikator risiko untuk diperiksa, bukan bukti pelanggaran.',
  });
}

test('2B.1 — menolak keluaran yang bukan JSON', () => {
  assert.throws(
    () => validateOutput('bukan json', { allowedCodes, allowedNumbers }),
    ValidationError,
  );
});

test('2B.1 — menolak skema salah (temuan tanpa kode_aturan)', () => {
  const raw = JSON.stringify({
    ringkasan: 'x',
    temuan: [{ penjelasan: 'p', arti_bagi_warga: 'a' }],
    keterbatasan: [],
    saran_tindak_lanjut: [],
    penafian: 'bukan bukti',
  });
  assert.throws(() => validateOutput(raw, { allowedCodes, allowedNumbers }), ValidationError);
});

test('2B.1 — membuang temuan berkode_aturan tak dikenal, tolak bila semua dibuang', () => {
  const raw = JSON.stringify({
    ringkasan: 'x',
    temuan: [{ kode_aturan: 'X-99', penjelasan: 'p', arti_bagi_warga: 'a' }],
    keterbatasan: [],
    saran_tindak_lanjut: [],
    penafian: 'bukan bukti',
  });
  assert.throws(() => validateOutput(raw, { allowedCodes, allowedNumbers }), ValidationError);
});

test('2B.1 — menolak angka yang tidak ada di masukan', () => {
  const raw = JSON.stringify({
    ringkasan: 'Skor 77 tidak dikenal',
    temuan: [{ kode_aturan: 'D2-01', penjelasan: 'nilai 1', arti_bagi_warga: 'a' }],
    keterbatasan: [],
    saran_tindak_lanjut: [],
    penafian: 'bukan bukti',
  });
  assert.throws(() => validateOutput(raw, { allowedCodes, allowedNumbers }), ValidationError);
});

test('2B.1 — menerima keluaran valid', () => {
  const out = validateOutput(validRaw(), { allowedCodes, allowedNumbers });
  assert.equal(out.temuan.length, 2);
  assert.ok(out.penafian.toLowerCase().includes('bukan bukti'));
});

test('2B.1 — menambahkan penafian standar bila frasa "bukan bukti" hilang', () => {
  const raw = JSON.stringify({
    ringkasan: 'x',
    temuan: [{ kode_aturan: 'D2-01', penjelasan: 'nilai 1', arti_bagi_warga: 'a' }],
    keterbatasan: [],
    saran_tindak_lanjut: [],
    penafian: 'tanpa frasa kunci',
  });
  const out = validateOutput(raw, { allowedCodes, allowedNumbers });
  assert.ok(out.penafian.toLowerCase().includes('bukan bukti'));
});

test('2B.1 — angka dengan pemisah ribuan dianggap sama dengan angka masukan', () => {
  const allowed = collectNumbers({ nilai_kontrak: 6980867932, skor: 10 });
  const unknown = findUnknownNumbers('nilai kontrak 6.980.867.932 rupiah, skor 10', allowed);
  assert.deepEqual(unknown, []);
});

test('2B.1 — tetap menolak angka yang benar-benar tidak ada di masukan', () => {
  const allowed = collectNumbers({ nilai_kontrak: 6980867932 });
  const unknown = findUnknownNumbers('nilai kontrak 6.980.867.999', allowed);
  assert.deepEqual(unknown, ['6.980.867.999']);
});
