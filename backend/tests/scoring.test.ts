import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadScoringConfig, loadScoringConfigFrom } from '../src/config/scoring.js';
import {
  scoreProject,
  validateConfig,
  categorize,
} from '../src/services/scoring.js';
import type { ScoreInput } from '../src/types/scoring.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = loadScoringConfigFrom(path.join(root, 'config', 'scoring.json'));

test('config/scoring.json valid: bobot berjumlah 1 dan aturan terisi', () => {
  const sum = Object.values(config.dimension_weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `bobot berjumlah ${sum}`);
  assert.ok(config.rules.length >= 12, 'minimal 12 aturan (SRS 5)');
  assert.ok(['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].every((d) =>
    config.rules.some((r) => r.dimension === d),
  ));
  // loader berbasis cwd juga harus jalan dari root backend
  assert.ok(loadScoringConfig().rules.length > 0);
});

test('skenario Peningkatan Jalan → kategori Tinggi (skor 73)', () => {
  const input: ScoreInput = {
    kenaikan_pagu_pct: 5,
    selisih_hps_acuan_pct: 5,
    jumlah_penawar: 1, // D2-01 tinggi
    menang_hps_pct: 95,
    selisih_harga_acuan_pct: 28, // D2-03 tinggi
    konsentrasi_pemenang_pct: 20,
    selisih_volume_pct: 15, // D3-01 tinggi
    jumlah_laporan_terverifikasi: 1, // D3-02 sedang
    cair_minus_fisik_poin: 35, // D4-01 tinggi
    jumlah_temuan_bpk: 0,
    hari_rup_ke_tender: 30,
    hari_tanpa_tindak_lanjut: 0,
  };
  const r = scoreProject(input, config);
  assert.equal(r.kategori, 'Tinggi');
  assert.equal(r.skor_total, 73);
  assert.equal(r.dimensi.D2, 100);
  assert.equal(r.dimensi.D3, 100);
  assert.equal(r.dimensi.D4, 100);
});

test('skenario Rehabilitasi Jembatan → Perlu Perhatian (skor 38)', () => {
  const input: ScoreInput = {
    kenaikan_pagu_pct: 5,
    selisih_hps_acuan_pct: 5,
    jumlah_penawar: 4,
    menang_hps_pct: 90,
    selisih_harga_acuan_pct: 16, // D2-03 sedang
    konsentrasi_pemenang_pct: 10,
    selisih_volume_pct: 8, // D3-01 sedang
    jumlah_laporan_terverifikasi: 1, // D3-02 sedang
    cair_minus_fisik_poin: 15, // D4-01 sedang
    jumlah_temuan_bpk: 0,
    hari_rup_ke_tender: 30,
    hari_tanpa_tindak_lanjut: 0,
  };
  const r = scoreProject(input, config);
  assert.equal(r.kategori, 'Perlu Perhatian');
  assert.equal(r.skor_total, 38);
});

test('skenario Pembangunan Drainase → kategori Rendah (skor 10)', () => {
  const input: ScoreInput = {
    kenaikan_pagu_pct: 5,
    selisih_hps_acuan_pct: 5,
    jumlah_penawar: 5,
    menang_hps_pct: 90,
    selisih_harga_acuan_pct: 5,
    konsentrasi_pemenang_pct: 10,
    selisih_volume_pct: 2,
    jumlah_laporan_terverifikasi: 0,
    cair_minus_fisik_poin: 5,
    jumlah_temuan_bpk: 0,
    hari_rup_ke_tender: 30,
    hari_tanpa_tindak_lanjut: 0,
  };
  const r = scoreProject(input, config);
  assert.equal(r.kategori, 'Rendah');
  assert.equal(r.skor_total, 10);
});

test('dimensi data belum cukup dikeluarkan + bobot dinormalisasi (FR-10, FR-14)', () => {
  const input: ScoreInput = {
    jumlah_penawar: 1,
    menang_hps_pct: 99.9,
    selisih_harga_acuan_pct: 28,
    konsentrasi_pemenang_pct: 60,
    selisih_volume_pct: 15,
    jumlah_laporan_terverifikasi: 3,
    cair_minus_fisik_poin: 35,
  };
  const r = scoreProject(input, config);
  // D1, D5, D6 tidak punya field → data belum cukup
  assert.deepEqual(r.dimensi_data_belum_cukup.sort(), ['D1', 'D5', 'D6']);
  assert.equal(r.dimensi.D1, null);
  assert.equal(r.dimensi.D5, null);
  assert.equal(r.dimensi.D6, null);
  // bobot ternormalisasi hanya atas D2, D3, D4 → skor total 100
  assert.equal(r.skor_total, 100);
  assert.equal(r.kategori, 'Tinggi');
  assert.deepEqual(Object.keys(r.weights_used).sort(), ['D2', 'D3', 'D4']);
});

test('ambang kategori dan arah lte/gte', () => {
  assert.equal(categorize(34, config.category_thresholds), 'Rendah');
  assert.equal(categorize(35, config.category_thresholds), 'Perlu Perhatian');
  assert.equal(categorize(65, config.category_thresholds), 'Perlu Perhatian');
  assert.equal(categorize(66, config.category_thresholds), 'Tinggi');

  // lte: jumlah penawar 1 = tinggi, 2 = sedang, 3 = rendah
  const one = scoreProject({ jumlah_penawar: 1 }, config);
  const two = scoreProject({ jumlah_penawar: 2 }, config);
  const three = scoreProject({ jumlah_penawar: 3 }, config);
  assert.equal(one.dimensi.D2, 100);
  assert.equal(two.dimensi.D2, 50);
  assert.equal(three.dimensi.D2, 10);
});

test('validateConfig menolak arah ambang yang salah', () => {
  assert.throws(() =>
    validateConfig({
      category_thresholds: { rendah_max: 34, perlu_perhatian_max: 65 },
      level_points: { rendah: 10, sedang: 50, tinggi: 100 },
      dimension_weights: { D1: 0.15, D2: 0.25, D3: 0.2, D4: 0.25, D5: 0.05, D6: 0.1 },
      rules: [
        {
          code: 'X-01',
          dimension: 'D1',
          input: 'x',
          direction: 'lte',
          sedang: 2,
          tinggi: 10, // lte harusnya tinggi < sedang
          required_fields: ['x'],
        },
      ],
    }),
  );
});
