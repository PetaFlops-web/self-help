import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMatchScore } from '../src/services/matching.js';

test('calculateMatchScore: nama identik, dinas dan pagu sama → skor tinggi (>80)', () => {
  const a = { nama: 'Pembangunan Jalan Sudirman', dinas: 'Dinas PUPR', pagu: '1000000000' };
  const b = { nama: 'Pembangunan Jalan Sudirman', dinas: 'Dinas PUPR', pagu: '1000000000' };
  const score = calculateMatchScore(a, b);
  assert.ok(score > 80, `skor seharusnya >80, didapat ${score}`);
});

test('calculateMatchScore: dinas berbeda menghasilkan skor lebih rendah daripada identik', () => {
  const a = { nama: 'Pembangunan Jalan Sudirman', dinas: 'Dinas PUPR', pagu: '1000000000' };
  const identical = calculateMatchScore(a, {
    nama: 'Pembangunan Jalan Sudirman',
    dinas: 'Dinas PUPR',
    pagu: '1000000000',
  });
  const differentDinas = calculateMatchScore(a, {
    nama: 'Pembangunan Jalan Sudirman',
    dinas: 'Dinas Perhubungan',
    pagu: '1000000000',
  });
  assert.ok(
    differentDinas < identical,
    `skor dinas berbeda (${differentDinas}) seharusnya < identik (${identical})`,
  );
});

test('calculateMatchScore: nama mirip, dinas dan pagu berbeda → skor menengah', () => {
  const a = {
    nama: 'Pembangunan Jalan Sudirman Kota',
    dinas: 'Dinas PUPR',
    pagu: '1000000000',
  };
  const b = {
    nama: 'Pembangunan Jalan Sudirman Kabupaten',
    dinas: 'Dinas Perhubungan',
    pagu: '850000000',
  };
  const score = calculateMatchScore(a, b);
  assert.ok(
    score >= 20 && score < 70,
    `skor seharusnya menengah (20-69), didapat ${score}`,
  );
});

test('calculateMatchScore: sepenuhnya berbeda → skor rendah (<20)', () => {
  const a = { nama: 'Pembangunan Jalan Sudirman', dinas: 'Dinas PUPR', pagu: '1000000000' };
  const b = { nama: 'Pengadaan Meja Kantor', dinas: 'Dinas Kesehatan', pagu: '50000000' };
  const score = calculateMatchScore(a, b);
  assert.ok(score < 20, `skor seharusnya <20, didapat ${score}`);
});
