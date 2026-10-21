import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findForbiddenPhrases } from '../src/services/forbidden-phrases.js';
import { checkForbiddenPhrases, ValidationError } from '../src/services/validation.js';
import type { LlmOutput } from '../src/types/llm.js';

function outputWith(ringkasan: string): LlmOutput {
  return {
    ringkasan,
    temuan: [{ kode_aturan: 'D2-01', penjelasan: 'penjelasan', arti_bagi_warga: 'arti' }],
    keterbatasan: [],
    saran_tindak_lanjut: [{ langkah: 'langkah', lembaga: 'dinas_terkait' }],
    penafian: 'Ini indikator risiko untuk diperiksa, bukan bukti pelanggaran.',
  };
}

test('2B.2 — menolak keluaran yang memuat "korupsi"', () => {
  assert.throws(
    () => checkForbiddenPhrases(outputWith('Proyek ini terindikasi korupsi')),
    ValidationError,
  );
});

test('2B.2 — menolak keluaran yang memuat "suap"', () => {
  assert.throws(
    () => checkForbiddenPhrases(outputWith('Ada indikasi suap pada pengadaan')),
    ValidationError,
  );
});

test('2B.2 — mengizinkan "korupsi" hanya pada nama lembaga', () => {
  assert.deepEqual(
    findForbiddenPhrases('Laporan diteruskan ke Komisi Pemberantasan Korupsi.'),
    [],
  );
});

test('2B.2 — tidak salah tangkap "memastikan" sebagai frasa "pasti"', () => {
  assert.deepEqual(findForbiddenPhrases('Perlu memastikan dokumen lengkap.'), []);
});

test('2B.2 — menangkap frasa multi-kata "melanggar hukum"', () => {
  assert.ok(findForbiddenPhrases('diduga melanggar hukum').includes('melanggar hukum'));
});

test('2B.2 — keluaran bersih lolos filter', () => {
  assert.doesNotThrow(() =>
    checkForbiddenPhrases(outputWith('Skor risiko perlu diperiksa lebih lanjut.')),
  );
});
