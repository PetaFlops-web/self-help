import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pool from '../src/config/database.js';
import { loadScoringConfig, loadScoringConfigFrom } from '../src/config/scoring.js';
import {
  scoreProject,
  validateConfig,
  categorize,
} from '../src/services/scoring.js';
import { collectScoreInput, recalculateProjectScoreInTx } from '../src/services/project-scoring.js';
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
  assert.ok(loadScoringConfig().rules.length > 0);
});

test('skenario Peningkatan Jalan → kategori Tinggi (skor 76)', () => {
  const input: ScoreInput = {
    kenaikan_pagu_pct: 5,
    selisih_hps_acuan_pct: 5,
    jumlah_penawar: 1,
    menang_hps_pct: 95,
    selisih_harga_acuan_pct: 28,
    konsentrasi_pemenang_pct: 20,
    selisih_volume_pct: 15,
    jumlah_laporan_terverifikasi: 1,
    cair_minus_fisik_poin: 35,
    jumlah_temuan_bpk: 0,
    hari_rup_ke_tender: 30,
    hari_tanpa_tindak_lanjut: 0,
  };
  const r = scoreProject(input, config);
  assert.equal(r.kategori, 'Tinggi');
  assert.equal(r.skor_total, 76);
  assert.equal(r.dimensi.D2, 100);
  assert.equal(r.dimensi.D3, 100);
  assert.equal(r.dimensi.D4, 100);
});

test('skenario Rehabilitasi Jembatan → Perlu Perhatian (skor 39)', () => {
  const input: ScoreInput = {
    kenaikan_pagu_pct: 5,
    selisih_hps_acuan_pct: 5,
    jumlah_penawar: 4,
    menang_hps_pct: 90,
    selisih_harga_acuan_pct: 16,
    konsentrasi_pemenang_pct: 10,
    selisih_volume_pct: 8,
    jumlah_laporan_terverifikasi: 1,
    cair_minus_fisik_poin: 15,
    jumlah_temuan_bpk: 0,
    hari_rup_ke_tender: 30,
    hari_tanpa_tindak_lanjut: 0,
  };
  const r = scoreProject(input, config);
  assert.equal(r.kategori, 'Perlu Perhatian');
  assert.equal(r.skor_total, 39);
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
  assert.deepEqual(r.dimensi_data_belum_cukup.sort(), ['D1', 'D5', 'D6']);
  assert.equal(r.dimensi.D1, null);
  assert.equal(r.dimensi.D5, null);
  assert.equal(r.dimensi.D6, null);
  assert.equal(r.skor_total, 100);
  assert.equal(r.kategori, 'Tinggi');
  assert.deepEqual(Object.keys(r.weights_used).sort(), ['D2', 'D3', 'D4']);
});

test('ambang kategori dan arah lte/gte', () => {
  assert.equal(categorize(34, config.category_thresholds), 'Rendah');
  assert.equal(categorize(35, config.category_thresholds), 'Perlu Perhatian');
  assert.equal(categorize(65, config.category_thresholds), 'Perlu Perhatian');
  assert.equal(categorize(66, config.category_thresholds), 'Tinggi');

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
          tinggi: 10,
          required_fields: ['x'],
        },
      ],
    }),
  );
});

test('D3-01 selisih_volume_pct: ambang sedang ≥8, tinggi ≥15, dan data belum cukup bila kosong', () => {
  const baseInput: ScoreInput = {
    jumlah_penawar: 3,
    menang_hps_pct: 95,
    selisih_harga_acuan_pct: 28,
    jumlah_laporan_terverifikasi: 1,
    cair_minus_fisik_poin: 35,
    hari_rup_ke_tender: 30,
  };

  const tinggi = scoreProject({ ...baseInput, selisih_volume_pct: 20 }, config);
  const d3Tinggi = tinggi.indikator_temuan.find((f) => f.kode_aturan === 'D3-01');
  assert.ok(d3Tinggi, 'D3-01 harus muncul saat selisih_volume_pct=20');
  assert.equal(d3Tinggi!.tingkat, 'tinggi');
  assert.equal(d3Tinggi!.nilai_terukur, 20);

  const sedang = scoreProject({ ...baseInput, selisih_volume_pct: 10 }, config);
  const d3Sedang = sedang.indikator_temuan.find((f) => f.kode_aturan === 'D3-01');
  assert.ok(d3Sedang, 'D3-01 harus muncul saat selisih_volume_pct=10');
  assert.equal(d3Sedang!.tingkat, 'sedang');

  const rendah = scoreProject({ ...baseInput, selisih_volume_pct: 3 }, config);
  const d3Rendah = rendah.indikator_temuan.find((f) => f.kode_aturan === 'D3-01');
  assert.ok(d3Rendah, 'D3-01 muncul dengan tingkat rendah saat selisih_volume_pct=3');
  assert.equal(d3Rendah!.tingkat, 'rendah');

  const kosong = scoreProject(baseInput, config);
  const d3Kosong = kosong.indikator_temuan.find((f) => f.kode_aturan === 'D3-01');
  assert.ok(!d3Kosong, 'D3-01 tidak boleh muncul bila selisih_volume_pct tidak diisi (data belum cukup)');
});

test('D1-01 dan D2-04 aturan scoring.json aktif dengan ambang dan sumber benar', () => {
  const baseInput: ScoreInput = {
    jumlah_penawar: 3,
    menang_hps_pct: 95,
    selisih_harga_acuan_pct: 5,
    jumlah_laporan_terverifikasi: 0,
    cair_minus_fisik_poin: 5,
    hari_rup_ke_tender: 30,
  };

  const d1Tinggi = scoreProject({ ...baseInput, kenaikan_pagu_pct: 40 }, config).indikator_temuan.find(
    (f) => f.kode_aturan === 'D1-01',
  );
  assert.ok(d1Tinggi);
  assert.equal(d1Tinggi!.tingkat, 'tinggi');
  assert.equal(d1Tinggi!.sumber, 'SRC-04, SRC-01');

  const d1Sedang = scoreProject({ ...baseInput, kenaikan_pagu_pct: 25 }, config).indikator_temuan.find(
    (f) => f.kode_aturan === 'D1-01',
  );
  assert.equal(d1Sedang?.tingkat, 'sedang');

  const d1Rendah = scoreProject({ ...baseInput, kenaikan_pagu_pct: 10 }, config).indikator_temuan.find(
    (f) => f.kode_aturan === 'D1-01',
  );
  assert.equal(d1Rendah?.tingkat, 'rendah');

  const d2Tinggi = scoreProject({ ...baseInput, konsentrasi_pemenang_pct: 50 }, config).indikator_temuan.find(
    (f) => f.kode_aturan === 'D2-04',
  );
  assert.ok(d2Tinggi);
  assert.equal(d2Tinggi!.tingkat, 'tinggi');

  const d2Sedang = scoreProject({ ...baseInput, konsentrasi_pemenang_pct: 33 }, config).indikator_temuan.find(
    (f) => f.kode_aturan === 'D2-04',
  );
  assert.equal(d2Sedang?.tingkat, 'sedang');

  const d2Rendah = scoreProject({ ...baseInput, konsentrasi_pemenang_pct: 25 }, config).indikator_temuan.find(
    (f) => f.kode_aturan === 'D2-04',
  );
  assert.equal(d2Rendah?.tingkat, 'rendah');
});

test('integrasi DB D1-01: kenaikan_pagu_pct dihitung dari anggaran_dinas T vs T-1 dan aman terhadap pagu 0/hilang', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO wilayah (kode_bps, nama, lat, lng) VALUES ('1871', 'Kota Bandar Lampung', -5.45, 105.27) ON CONFLICT (kode_bps) DO NOTHING`);
    const projRes = await client.query<{ id: string }>(
      `INSERT INTO proyek (kode_rup, nama, dinas, kode_bps, tahun_anggaran, pagu, hps, nilai_kontrak, source_id)
       VALUES ('TEST-SCORING-D1-01', 'Proyek Uji D1-01', 'Dinas Uji Scoring D1', '1871', 2025, 500000000, 480000000, 470000000, 'SRC-01')
       RETURNING id`,
    );
    const projectId = projRes.rows[0].id;

    await client.query(
      `INSERT INTO anggaran_dinas (dinas, kode_bps, tahun, pagu, is_dummy) VALUES
       ('Dinas Uji Scoring D1', '1871', 2024, 1000000000, true),
       ('Dinas Uji Scoring D1', '1871', 2025, 1450000000, true)`,
    );
    const resTinggi = await recalculateProjectScoreInTx(client, projectId);
    const d1Tinggi = resTinggi.indikator_temuan.find((f) => f.kode_aturan === 'D1-01');
    assert.equal(d1Tinggi?.nilai_terukur, 45);
    assert.equal(d1Tinggi?.tingkat, 'tinggi');

    await client.query(
      `UPDATE anggaran_dinas SET pagu = 1250000000 WHERE dinas = 'Dinas Uji Scoring D1' AND kode_bps = '1871' AND tahun = 2025`,
    );
    const resSedang = await recalculateProjectScoreInTx(client, projectId);
    assert.equal(resSedang.indikator_temuan.find((f) => f.kode_aturan === 'D1-01')?.tingkat, 'sedang');

    await client.query(
      `UPDATE anggaran_dinas SET pagu = 1100000000 WHERE dinas = 'Dinas Uji Scoring D1' AND kode_bps = '1871' AND tahun = 2025`,
    );
    const resRendah = await recalculateProjectScoreInTx(client, projectId);
    assert.equal(resRendah.indikator_temuan.find((f) => f.kode_aturan === 'D1-01')?.tingkat, 'rendah');

    await client.query(
      `UPDATE anggaran_dinas SET pagu = 0 WHERE dinas = 'Dinas Uji Scoring D1' AND kode_bps = '1871' AND tahun = 2024`,
    );
    const zeroPrevInput = await collectScoreInput(client, projectId);
    assert.equal(zeroPrevInput.kenaikan_pagu_pct, undefined);

    await client.query(
      `DELETE FROM anggaran_dinas WHERE dinas = 'Dinas Uji Scoring D1' AND kode_bps = '1871' AND tahun = 2024`,
    );
    const missingPrevInput = await collectScoreInput(client, projectId);
    assert.equal(missingPrevInput.kenaikan_pagu_pct, undefined);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

test('integrasi DB D2-04: konsentrasi_pemenang_pct patuh batas minimal 2 paket serta skenario rendah/sedang/tinggi', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO wilayah (kode_bps, nama, lat, lng) VALUES ('1871', 'Kota Bandar Lampung', -5.45, 105.27) ON CONFLICT (kode_bps) DO NOTHING`);

    const cWinA = (await client.query<{ id: string }>(`INSERT INTO perusahaan (nama_badan_usaha, is_dummy) VALUES ('PT Uji Menang A', true) RETURNING id`)).rows[0].id;
    const cWinB = (await client.query<{ id: string }>(`INSERT INTO perusahaan (nama_badan_usaha, is_dummy) VALUES ('PT Uji Menang B', true) RETURNING id`)).rows[0].id;
    const cWinC = (await client.query<{ id: string }>(`INSERT INTO perusahaan (nama_badan_usaha, is_dummy) VALUES ('PT Uji Menang C', true) RETURNING id`)).rows[0].id;
    const cWinD = (await client.query<{ id: string }>(`INSERT INTO perusahaan (nama_badan_usaha, is_dummy) VALUES ('PT Uji Menang D', true) RETURNING id`)).rows[0].id;
    const cRunnerUp = (await client.query<{ id: string }>(`INSERT INTO perusahaan (nama_badan_usaha, is_dummy) VALUES ('PT Uji Pendamping', true) RETURNING id`)).rows[0].id;

    const insertProjTender = async (code: string, winnerId: string): Promise<string> => {
      const pId = (
        await client.query<{ id: string }>(
          `INSERT INTO proyek (kode_rup, nama, dinas, kode_bps, tahun_anggaran, pagu, source_id)
           VALUES ($1, $1, 'Dinas Uji Scoring D2', '1871', 2025, 100000000, 'SRC-01')
           RETURNING id`,
          [code],
        )
      ).rows[0].id;
      const tId = (
        await client.query<{ id: string }>(
          `INSERT INTO tender (proyek_id, jumlah_penawar, harga_penawaran_menang, is_dummy)
           VALUES ($1, 2, 95000000, true) RETURNING id`,
          [pId],
        )
      ).rows[0].id;
      await client.query(
        `INSERT INTO peserta_tender (tender_id, perusahaan_id, harga_penawaran, menang, is_dummy)
         VALUES ($1, $2, 95000000, true, true), ($1, $3, 98000000, false, true)`,
        [tId, winnerId, cRunnerUp],
      );
      return pId;
    };

    const p1 = await insertProjTender('TEST-SCORING-D2-01', cWinA);
    const singlePkgInput = await collectScoreInput(client, p1);
    assert.equal(singlePkgInput.konsentrasi_pemenang_pct, undefined, 'dinas dengan 1 paket tidak boleh memicu bias 100%');

    await insertProjTender('TEST-SCORING-D2-02', cWinA);
    const resTinggi = await recalculateProjectScoreInTx(client, p1);
    const d2Tinggi = resTinggi.indikator_temuan.find((f) => f.kode_aturan === 'D2-04');
    assert.equal(d2Tinggi?.nilai_terukur, 100);
    assert.equal(d2Tinggi?.tingkat, 'tinggi');

    const p3 = await insertProjTender('TEST-SCORING-D2-03', cWinB);
    const resSedang = await recalculateProjectScoreInTx(client, p3);
    const d2Sedang = resSedang.indikator_temuan.find((f) => f.kode_aturan === 'D2-04');
    assert.equal(d2Sedang?.nilai_terukur, 33);
    assert.equal(d2Sedang?.tingkat, 'sedang');

    await insertProjTender('TEST-SCORING-D2-04', cWinC);
    const resRendahB = await recalculateProjectScoreInTx(client, p3);
    const d2Rendah = resRendahB.indikator_temuan.find((f) => f.kode_aturan === 'D2-04');
    assert.equal(d2Rendah?.nilai_terukur, 25);
    assert.equal(d2Rendah?.tingkat, 'rendah');

    const pNoWinner = (
      await client.query<{ id: string }>(
        `INSERT INTO proyek (kode_rup, nama, dinas, kode_bps, tahun_anggaran, pagu, source_id)
         VALUES ('TEST-SCORING-D2-05', 'Tanpa Pemenang', 'Dinas Uji Scoring D2', '1871', 2025, 100000000, 'SRC-01')
         RETURNING id`,
      )
    ).rows[0].id;
    const tNoWin = (
      await client.query<{ id: string }>(
        `INSERT INTO tender (proyek_id, jumlah_penawar, harga_penawaran_menang, is_dummy)
         VALUES ($1, 1, 95000000, true) RETURNING id`,
        [pNoWinner],
      )
    ).rows[0].id;
    await client.query(
      `INSERT INTO peserta_tender (tender_id, perusahaan_id, harga_penawaran, menang, is_dummy)
       VALUES ($1, $2, 95000000, false, true)`,
      [tNoWin, cWinD],
    );
    const noWinnerInput = await collectScoreInput(client, pNoWinner);
    assert.equal(noWinnerInput.konsentrasi_pemenang_pct, undefined);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

after(async () => {
  await pool.end();
});
