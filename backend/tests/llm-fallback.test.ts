import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackExplain,
  buildFallbackDraft,
} from '../src/services/llm-explanation.js';
import type { Proyek } from '../src/types/proyek.js';
import type { ScoreResult } from '../src/types/scoring.js';

const proyek: Proyek = {
  id: '11111111-0000-4000-8000-000000000001',
  kode_rup: null,
  kode_tender: null,
  nama: 'Pembangunan Embung Kemiling',
  dinas: 'Pemprov Lampung',
  kode_bps: '1871',
  lat: null,
  lng: null,
  tahun_anggaran: 2025,
  sumber_dana: null,
  metode_pemilihan: null,
  pagu: null,
  hps: null,
  nilai_kontrak: '6980867932',
  status: null,
  pengumuman_rup_tgl: null,
  match_status: null,
  skor_total: '89',
  kategori: 'Tinggi',
  is_dummy: true,
  source_id: null,
  source_url: null,
  fetched_at: null,
  kabupaten: 'Kota Bandar Lampung',
};

const result: ScoreResult = {
  skor_total: 89,
  kategori: 'Tinggi',
  dimensi: { D1: null, D2: 100, D3: 10, D4: null, D5: null, D6: null },
  indikator_temuan: [
    {
      dimensi: 'D2',
      kode_aturan: 'D2-01',
      nilai_terukur: 1,
      ambang: 1,
      tingkat: 'tinggi',
      sumber: 'SRC-02',
      uraian_aturan: 'Hanya satu penawar',
    },
  ],
  dimensi_data_belum_cukup: ['D1', 'D4', 'D5', 'D6'],
  weights_used: { D2: 1, D3: 1 },
};

test('fallback explain memenuhi skema 6.5 dan tanpa frasa terlarang', () => {
  const out = buildFallbackExplain(proyek, result);

  assert.equal(typeof out.ringkasan, 'string');
  assert.ok(Array.isArray(out.temuan) && out.temuan.length >= 1);
  assert.ok(Array.isArray(out.keterbatasan));
  assert.ok(Array.isArray(out.saran_tindak_lanjut));
  assert.match(out.penafian, /bukan bukti/);

  const text = JSON.stringify(out);
  for (const banned of ['korupsi', 'pelaku', 'tersangka', 'pasti']) {
    assert.ok(!text.toLowerCase().includes(banned), `frasa terlarang "${banned}" muncul`);
  }

  // Dimensi data belum cukup disebut, dan is_dummy dicatat.
  assert.ok(out.keterbatasan.some((k) => k.includes('D1')));
  assert.ok(out.keterbatasan.some((k) => k.includes('simulasi')));
});

test('fallback draft memenuhi skema 6.5 T2', () => {
  const out = buildFallbackDraft(proyek, result, 'inspektorat', [
    { tiket: 'AT-2026-000123', kategori: 'volume pekerjaan', ringkasan: '<data_pelapor>x</data_pelapor>' },
  ]);

  assert.equal(typeof out.kepada, 'string');
  assert.equal(typeof out.perihal, 'string');
  assert.equal(typeof out.pembuka, 'string');
  assert.ok(Array.isArray(out.uraian_indikator) && out.uraian_indikator.length >= 1);
  assert.equal(typeof out.permohonan, 'string');
  assert.equal(typeof out.penutup, 'string');
  assert.match(out.penafian, /bukan bukti/);
  assert.ok(Array.isArray(out.lampiran_disarankan));
  assert.ok(out.lampiran_disarankan.some((l) => l.includes('AT-2026-000123')));
});
