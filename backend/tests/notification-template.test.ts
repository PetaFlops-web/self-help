import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationEmail } from '../src/services/notification/template.js';

test('buildNotificationEmail menghasilkan subject, text fallback, dan html terstruktur', () => {
  const result = buildNotificationEmail({
    tiket: 'LPR-2026-0042',
    statusDari: 'Dilaporkan',
    statusKe: 'Diverifikasi',
    surelPelapor: 'warga@example.com',
  });

  assert.equal(result.subject, 'Status Laporan LPR-2026-0042 Diperbarui');
  assert.ok(result.text.includes('LPR-2026-0042'));
  assert.ok(result.text.includes('Diverifikasi'));
  assert.ok(result.text.includes('/lacak-laporan?code=LPR-2026-0042'));

  assert.ok(result.html.startsWith('<!DOCTYPE html>'));
  assert.ok(result.html.includes('<html lang="id">'));
  assert.ok(result.html.includes('Clearsight'));
  assert.ok(result.html.includes('LPR-2026-0042'));
  assert.ok(result.html.includes('Diverifikasi'));
  assert.ok(result.html.includes('/lacak-laporan?code=LPR-2026-0042'));
  assert.ok(result.html.includes('Lacak Laporan'));
});

test('buildNotificationEmail memetakan warna badge sesuai status laporan dan mendukung fallback', () => {
  const cases = [
    { status: 'Dilaporkan', color: '#2F6FDE', bg: '#EBF2FC' },
    { status: 'Diverifikasi', color: '#2E8B57', bg: '#E3F2EA' },
    { status: 'Diteruskan', color: '#2F6FDE', bg: '#EBF2FC' },
    { status: 'Ditindaklanjuti', color: '#D97706', bg: '#FDF0D8' },
    { status: 'Selesai', color: '#2E8B57', bg: '#E3F2EA' },
    { status: 'Ditolak', color: '#D63A1F', bg: '#FCE4DF' },
    { status: 'StatusLain', color: '#111111', bg: '#EBE7E2' },
  ];

  for (const c of cases) {
    const result = buildNotificationEmail({
      tiket: 'LPR-001',
      statusDari: 'Dilaporkan',
      statusKe: c.status,
      surelPelapor: null,
    });
    assert.ok(result.html.includes(`color:${c.color};background-color:${c.bg};`), c.status);
  }
});

test('buildNotificationEmail meng-escape karakter HTML berbahaya pada input dinamis', () => {
  const result = buildNotificationEmail({
    tiket: '<script>alert("xss")</script>',
    statusDari: 'Dilaporkan',
    statusKe: 'Selesai & "Terverifikasi"',
    surelPelapor: null,
  });

  assert.ok(!result.html.includes('<script>'));
  assert.ok(result.html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
  assert.ok(result.html.includes('Selesai &amp; &quot;Terverifikasi&quot;'));
  assert.ok(
    result.html.includes('/lacak-laporan?code=%3Cscript%3Ealert(%22xss%22)%3C%2Fscript%3E'),
  );
});

test('buildNotificationEmail menjaga pembatasan isi FR-55 pada status Ditolak maupun payload ekstra', () => {
  const payloadWithExtraFields = {
    tiket: 'LPR-2026-0099',
    statusDari: 'Dilaporkan',
    statusKe: 'Ditolak',
    surelPelapor: 'pelapor@rahasia.test',
    keterangan: 'NARASI_RAHASIA_WARGA',
    alasan_tolak: 'ALASAN_TOLAK_INTERNAL',
    catatan_verifikator: 'CATATAN_INTERNAL',
    lembaga_tujuan: 'INSPEKTORAT_RAHASIA',
  };

  const result = buildNotificationEmail(payloadWithExtraFields);
  const combined = `${result.subject}\n${result.text}\n${result.html}`;

  for (const forbidden of [
    'pelapor@rahasia.test',
    'NARASI_RAHASIA_WARGA',
    'ALASAN_TOLAK_INTERNAL',
    'CATATAN_INTERNAL',
    'INSPEKTORAT_RAHASIA',
  ]) {
    assert.ok(!combined.includes(forbidden), `Surel tidak boleh memuat ${forbidden}`);
  }
});
