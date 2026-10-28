import pool from '../src/config/database.js';
import { recalculateProjectScore } from '../src/services/project-scoring.js';

const REGIONS = [
  { kode_bps: '1803', nama: 'Lampung Utara', lat: -4.82, lng: 104.8 },
  { kode_bps: '1805', nama: 'Tulang Bawang', lat: -4.47, lng: 105.3 },
  { kode_bps: '1806', nama: 'Tanggamus', lat: -5.35, lng: 104.67 },
  { kode_bps: '1808', nama: 'Way Kanan', lat: -4.52, lng: 104.55 },
  { kode_bps: '1810', nama: 'Mesuji', lat: -4.0, lng: 105.1 },
  { kode_bps: '1812', nama: 'Pesisir Barat', lat: -5.19, lng: 103.94 },
  { kode_bps: '1871', nama: 'Kota Bandar Lampung', lat: -5.45, lng: 105.27 },
];

const DATA_SOURCES = [
  { source_id: 'SRC-06', nama: 'LHP BPK RI Perwakilan Provinsi Lampung (via pemberitaan)', url: 'https://lampung.bpk.go.id', lisensi: 'Publik', atribusi: 'BPK RI' },
  { source_id: 'SRC-11', nama: 'Pemberitaan media: InilampungCom', url: 'https://www.inilampung.com', lisensi: 'Kutipan berita', atribusi: 'InilampungCom' },
  { source_id: 'SRC-12', nama: 'Pemberitaan media: SinarLampung', url: 'https://sinarlampung.co', lisensi: 'Kutipan berita', atribusi: 'sinarlampung.co' },
  { source_id: 'SRC-13', nama: 'Pemberitaan media: Detik/Liputan6/Kompas', url: 'https://www.detik.com', lisensi: 'Kutipan berita', atribusi: 'Detik, Liputan6, Kompas' },
  { source_id: 'SRC-14', nama: 'Siaran penegak hukum: Polda & Kejati Lampung (via media)', url: 'https://www.liputan6.com', lisensi: 'Publik', atribusi: 'Polda Lampung, Kejati Lampung' },
];

interface SeedProject {
  n: number;
  nama: string;
  dinas: string;
  kode_bps: string;
  tahun: number;
  sumber_dana: string | null;
  nilai_kontrak: number | null;
  status: 'perencanaan' | 'tender' | 'kontrak' | 'pelaksanaan' | 'selesai';
  penyedia: string | null;
  source_id: string;
  source_url: string;
}

const PROJECTS: SeedProject[] = [
  {
    n: 1, nama: 'Pembangunan Embung Kemiling (Sumber Agung, Kemiling)', dinas: 'Pemprov Lampung',
    kode_bps: '1871', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 6_980_867_932, status: 'selesai',
    penyedia: 'CV Raden Galuh', source_id: 'SRC-06',
    source_url: 'https://www.inilampung.com/2026/08/temuan-bpk-di-proyek-embung-kemiling.html',
  },
  {
    n: 2, nama: 'Perkuatan Tebing Sungai Way Paku II Tahap I (Pekon Paku, Kelumbayan)', dinas: 'Dinas PSDA Provinsi Lampung',
    kode_bps: '1806', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 6_726_163_893, status: 'selesai',
    penyedia: 'CV BC', source_id: 'SRC-06',
    source_url: 'https://www.inilampung.com/2026/07/dprd-lampung-heran-proyek-rp67-m-kurang.html',
  },
  {
    n: 3, nama: 'Perkuatan Tebing Sungai Way Paku I Tahap I (Pekon Paku, Kelumbayan)', dinas: 'Dinas PSDA Provinsi Lampung',
    kode_bps: '1806', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 5_630_539_633, status: 'selesai',
    penyedia: 'CV GPJ', source_id: 'SRC-06',
    source_url: 'https://www.inilampung.com/2026/07/dprd-lampung-heran-proyek-rp67-m-kurang.html',
  },
  {
    n: 4, nama: 'Perkuatan Tebing Sungai Pekon Gunung Kasih (Pugung)', dinas: 'Dinas PSDA Provinsi Lampung',
    kode_bps: '1806', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 2_207_805_658, status: 'selesai',
    penyedia: 'CV AS', source_id: 'SRC-06',
    source_url: 'https://www.inilampung.com/2026/07/dprd-lampung-heran-proyek-rp67-m-kurang.html',
  },
  {
    n: 5, nama: 'Rekonstruksi Jalan Bujung Tenuk - Penumangan (Link 086)', dinas: 'Dinas BMBK Provinsi Lampung',
    kode_bps: '1805', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 6_468_760_410, status: 'selesai',
    penyedia: 'PT BMBK Karya Utama', source_id: 'SRC-06',
    source_url: 'https://sinarlampung.co/2026/08/31/temuan-bpk-10-proyek-jalan-dinas-bmbk-lampung-bermasalah-kelebihan-bayar-tembus-rp27-miliar/',
  },
  {
    n: 6, nama: 'Rekonstruksi Jalan Simpang Empat - Kasui (Link 074)', dinas: 'Dinas BMBK Provinsi Lampung',
    kode_bps: '1808', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 4_923_673_660, status: 'selesai',
    penyedia: 'PT Simpang Empat Mandiri', source_id: 'SRC-06',
    source_url: 'https://sinarlampung.co/2026/08/31/temuan-bpk-10-proyek-jalan-dinas-bmbk-lampung-bermasalah-kelebihan-bayar-tembus-rp27-miliar/',
  },
  {
    n: 7, nama: 'Rekonstruksi Jalan Tajab - Adi Jaya (Link 089)', dinas: 'Dinas BMBK Provinsi Lampung',
    kode_bps: '1808', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 4_853_298_300, status: 'selesai',
    penyedia: 'PT Tajab Jaya', source_id: 'SRC-06',
    source_url: 'https://sinarlampung.co/2026/08/31/temuan-bpk-10-proyek-jalan-dinas-bmbk-lampung-bermasalah-kelebihan-bayar-tembus-rp27-miliar/',
  },
  {
    n: 8, nama: 'Rekonstruksi Jalan Ketapang - Negara Ratu (Link 071)', dinas: 'Dinas BMBK Provinsi Lampung',
    kode_bps: '1803', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 3_770_929_700, status: 'selesai',
    penyedia: 'PT Ketapang Negara', source_id: 'SRC-06',
    source_url: 'https://sinarlampung.co/2026/08/31/temuan-bpk-10-proyek-jalan-dinas-bmbk-lampung-bermasalah-kelebihan-bayar-tembus-rp27-miliar/',
  },
  {
    n: 9, nama: 'Peningkatan Jalan Desa Isorejo - Bandar Agung', dinas: 'Pemkab Lampung Utara',
    kode_bps: '1803', tahun: 2019, sumber_dana: 'APBD', nilai_kontrak: 3_470_000_000, status: 'selesai',
    penyedia: 'CV Isorejo Bandar Agung', source_id: 'SRC-14',
    source_url: 'https://www.detik.com/sumbagsel/hukum-dan-kriminal/d-8696588/8-kontraktor-yang-korupsi-proyek-jalan-di-lampung-utara-ditahan',
  },
  {
    n: 10, nama: 'Peningkatan Jalan Desa Sukamaju - Simpang Tatakarya', dinas: 'Pemkab Lampung Utara',
    kode_bps: '1803', tahun: 2019, sumber_dana: null, nilai_kontrak: 3_350_000_000, status: 'selesai',
    penyedia: 'CV Al Fath Hakiki', source_id: 'SRC-14',
    source_url: 'https://www.detik.com/sumbagsel/hukum-dan-kriminal/d-8696588/8-kontraktor-yang-korupsi-proyek-jalan-di-lampung-utara-ditahan',
  },
  {
    n: 11, nama: 'Pembangunan Jalan Tol Terbanggi Besar - Pematang Panggang - Kayu Agung (STA 100+200 s/d 112+200)', dinas: 'Project Jalan Tol Trans Sumatera',
    kode_bps: '1810', tahun: 2017, sumber_dana: null, nilai_kontrak: 1_253_922_600_000, status: 'selesai',
    penyedia: 'PT Waskita Karya (Persero) Tbk', source_id: 'SRC-14',
    source_url: 'https://www.detik.com/sumbagsel/hukum-dan-kriminal/d-7872001/kejati-ungkap-korupsi-pembangunan-jalan-tol-lampung-negara-rugi-rp-66-m',
  },
  {
    n: 12, nama: 'Pembukaan Badan Jalan Pekon Bambang - Batubulan (Pekon Malaya, Lemong)', dinas: 'Dinas PU dan Penataan Ruang Pesisir Barat',
    kode_bps: '1812', tahun: 2022, sumber_dana: 'DID (Dana Insentif Daerah)', nilai_kontrak: 4_410_000_000, status: 'selesai',
    penyedia: 'PT Citra Primadona Perkasa', source_id: 'SRC-14',
    source_url: 'https://www.liputan6.com/regional/read/5823094/kejati-lampung-tetapkan-tiga-tersangka-kasus-korupsi-pekerjaan-jalan-di-pesisir-barat-senilai-rp13-m',
  },
  {
    n: 13, nama: 'Rehabilitasi Jalan Kampung Jawa - Sukanegara', dinas: 'Dinas PUPR Pesisir Barat',
    kode_bps: '1812', tahun: 2026, sumber_dana: null, nilai_kontrak: 2_200_000_000, status: 'pelaksanaan',
    penyedia: null, source_id: 'SRC-11',
    source_url: 'https://www.megarajawali.com/2026/08/tiga-paket-jalan-pupr-pesibar-belum.html',
  },
];

interface Finding {
  n: number;
  jenis: 'audit_bpk' | 'penyidikan';
  kurang_volume: number | null;
  tidak_sesuai_spek: number | null;
  kelebihan_bayar_atau_kerugian: number;
  catatan: string;
  dokumen: string | null;
}

const FINDINGS: Finding[] = [
  { n: 1, jenis: 'audit_bpk', kurang_volume: 263_595_470, tidak_sesuai_spek: 119_846_137, kelebihan_bayar_atau_kerugian: 383_441_628, catatan: 'Menurut artikel, kelebihan bayar sudah dikembalikan ke kas daerah. Komponen dan total di artikel selisih Rp20.', dokumen: 'LHP 43B/T/LHP/DJPKN-V.BLP/PPD.01/05/2026 (26 Mei 2026)' },
  { n: 2, jenis: 'audit_bpk', kurang_volume: 1_097_485_478, tidak_sesuai_spek: null, kelebihan_bayar_atau_kerugian: 1_097_485_478, catatan: 'Status pengembalian tidak dilaporkan artikel.', dokumen: 'LHP 43B/T/LHP/DJPKN-V.BLP/PPD.01/05/2026 (26 Mei 2026)' },
  { n: 3, jenis: 'audit_bpk', kurang_volume: 652_047_305, tidak_sesuai_spek: null, kelebihan_bayar_atau_kerugian: 652_047_305, catatan: 'Status pengembalian tidak dilaporkan artikel.', dokumen: 'LHP 43B/T/LHP/DJPKN-V.BLP/PPD.01/05/2026 (26 Mei 2026)' },
  { n: 4, jenis: 'audit_bpk', kurang_volume: 214_959_461, tidak_sesuai_spek: null, kelebihan_bayar_atau_kerugian: 214_959_461, catatan: 'Status pengembalian tidak dilaporkan artikel.', dokumen: 'LHP 43B/T/LHP/DJPKN-V.BLP/PPD.01/05/2026 (26 Mei 2026)' },
  { n: 5, jenis: 'audit_bpk', kurang_volume: null, tidak_sesuai_spek: null, kelebihan_bayar_atau_kerugian: 646_876_041, catatan: 'Rincian volume/spesifikasi per paket tidak dimuat artikel. Dari 10 paket, baru ~Rp481 juta dikembalikan (total).', dokumen: 'LHP BPK atas Pemprov Lampung TA 2025 (pemeriksaan 4-11 April 2026)' },
  { n: 6, jenis: 'audit_bpk', kurang_volume: null, tidak_sesuai_spek: null, kelebihan_bayar_atau_kerugian: 492_367_366, catatan: 'Idem.', dokumen: 'LHP BPK atas Pemprov Lampung TA 2025' },
  { n: 7, jenis: 'audit_bpk', kurang_volume: null, tidak_sesuai_spek: null, kelebihan_bayar_atau_kerugian: 485_329_830, catatan: 'Idem.', dokumen: 'LHP BPK atas Pemprov Lampung TA 2025' },
  { n: 8, jenis: 'audit_bpk', kurang_volume: null, tidak_sesuai_spek: null, kelebihan_bayar_atau_kerugian: 377_092_970, catatan: 'Idem.', dokumen: 'LHP BPK atas Pemprov Lampung TA 2025' },
  { n: 9, jenis: 'penyidikan', kurang_volume: null, tidak_sesuai_spek: null, kelebihan_bayar_atau_kerugian: 2_100_000_000, catatan: 'Perkiraan kerugian negara untuk dua paket (no. 9 dan 10) digabung. 8 kontraktor ditahan Polda Lampung 5-6 Okt 2026; pekerjaan diduga tidak sesuai kontrak/spesifikasi.', dokumen: null },
  { n: 11, jenis: 'penyidikan', kurang_volume: null, tidak_sesuai_spek: null, kelebihan_bayar_atau_kerugian: 66_000_000_000, catatan: 'Kerugian negara ~Rp66 miliar (Kejati Lampung); modus: rekayasa LPJ. Putusan Tipikor PN Tanjungkarang No. 58/Pid.Sus-TPK/2025/PN.TJK (25 Feb 2026). Nilai kontrak Rp1.253.922.600.000 (detik) vs "Rp1,2 triliun" (Kompas).', dokumen: 'Putusan 58/Pid.Sus-TPK/2025/PN.TJK' },
  { n: 12, jenis: 'penyidikan', kurang_volume: null, tidak_sesuai_spek: null, kelebihan_bayar_atau_kerugian: 1_300_000_000, catatan: 'Kejati Lampung menetapkan 3 tersangka (Kadis PUPR, direktur PT Citra Primadona Perkasa, konsultan pengawas) pada 6 Des 2024.', dokumen: null },
];

type RiskLevel = 'tinggi' | 'perlu_perhatian' | 'rendah';

interface RequiredDocument {
  jenis: string;
  wajib: boolean;
}

interface ProcedureStep {
  tahapan: string;
}

const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  { jenis: 'RUP (Rencana Umum Pengadaan)', wajib: true },
  { jenis: 'KAK (Kerangka Acuan Kerja)', wajib: true },
  { jenis: 'Document Penawaran/Pemenang', wajib: true },
  { jenis: 'SPK / Kontrak', wajib: true },
  { jenis: 'Laporan Progress Fisik', wajib: true },
  { jenis: 'BA Serah Terima', wajib: true },
];

const PROCEDURE_STEPS: ProcedureStep[] = [
  { tahapan: 'Pengumuman RUP' },
  { tahapan: 'Pembukaan Tender' },
  { tahapan: 'Evaluasi Penawaran' },
  { tahapan: 'Penetapan Pemenang' },
  { tahapan: 'Penandatanganan Kontrak' },
  { tahapan: 'Pelaporan Progress' },
  { tahapan: 'Serah Terima Akhir' },
];

function isDocumentPublished(risk: RiskLevel, index: number): boolean {
  // Project tinggi = banyak dokumen tidak dipublikasikan
  // Project rendah = hampir semua dipublikasikan
  if (risk === 'tinggi') return index < 2;
  if (risk === 'perlu_perhatian') return index < 4;
  return index < 5 || index === 5;
}

function isProcedureFulfilled(risk: RiskLevel, index: number): boolean {
  if (risk === 'tinggi') return index < 3;
  if (risk === 'perlu_perhatian') return index < 5;
  return true;
}

interface ScenarioParams {
  acuanMargin: number; 
  menangFactor: number;
  jumlah_penawar: number;
  cair: number; 
  fisik: number; 
  hari_rup: number; 
  laporan: number;
}

interface RabTemplate {
  uraian: string;
  satuan: string;
  baseVolume: number;
}

const RAB_TEMPLATES: RabTemplate[] = [
  { uraian: 'Pekerjaan persiapan dan pengamanan lokasi', satuan: 'ls', baseVolume: 1 },
  { uraian: 'Galian tanah dan urugan padat', satuan: 'm3', baseVolume: 250 },
  { uraian: 'Beton struktur (ready mix + bekisting)', satuan: 'm3', baseVolume: 80 },
  { uraian: 'Pemasangan material utama (aspal/pipa/batu)', satuan: 'm', baseVolume: 1000 },
  { uraian: 'Pekerjaan finishing dan perapihan', satuan: 'm2', baseVolume: 500 },
  { uraian: 'Pengawasan teknis dan dokumentasi', satuan: 'ls', baseVolume: 1 },
];

function pseudoRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 9999 + index * 9973) * 10000;
  return x - Math.floor(x);
}

function splitAmount(total: number, count: number, seed: number): number[] {
  const weights = Array.from({ length: count }, (_, i) => 0.6 + pseudoRandom(seed, i) * 0.8);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const portions = weights.map((w) => Math.floor(total * (w / weightSum)));
  const remainder = total - portions.reduce((a, b) => a + b, 0);
  if (remainder !== 0) portions[portions.length - 1] += remainder;
  return portions;
}

function buildRabSchedule(referenceTotal: number, risk: RiskLevel, projectNum: number): Array<{ uraian: string; satuan: string; volume: number; harga_satuan: number; harga_acuan: number; kode_acuan: string }> {
  const count = 3 + (projectNum % 3); // 3, 4, atau 5 item
  const itemDeviations = [5, 0, -3, -7, -10];
  const baseAcuanPct = risk === 'tinggi' ? 22 : risk === 'perlu_perhatian' ? 14 : -5;
  const portions = splitAmount(referenceTotal, count, projectNum);

  return Array.from({ length: count }, (_, i) => {
    const tpl = RAB_TEMPLATES[i % RAB_TEMPLATES.length];
    const deviationPct = baseAcuanPct + itemDeviations[i];
    const hargaAcuan = Math.max(1, Math.round(portions[i] / tpl.baseVolume));
    const hargaSatuan = Math.max(1, Math.round(hargaAcuan * (1 + deviationPct / 100)));
    return {
      uraian: `${tpl.uraian} (paket ${projectNum}.${i + 1})`,
      satuan: tpl.satuan,
      volume: tpl.baseVolume,
      harga_satuan: hargaSatuan,
      harga_acuan: hargaAcuan,
      kode_acuan: `HAC-${projectNum}-${i + 1}`,
    };
  });
}

function buildPaymentSchedule(cairPct: number, status: SeedProject['status'], tahun: number): Array<{ termin_ke: number; tanggal: string; persen: number }> {
  const schedules: number[] = [];
  if (status === 'selesai') {
    if (cairPct >= 60) {
      schedules.push(30, 30, cairPct - 60);
    } else {
      schedules.push(Math.round(cairPct / 2), cairPct - Math.round(cairPct / 2));
    }
  } else {
    schedules.push(Math.round(cairPct / 2), cairPct - Math.round(cairPct / 2));
  }

  const baseDate = new Date(`${tahun}-01-15T00:00:00`);
  return schedules.map((persen, i) => {
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + (i + 1) * 3);
    return {
      termin_ke: i + 1,
      tanggal: d.toISOString().split('T')[0],
      persen,
    };
  });
}

function buildProgressSchedule(fisikPct: number, status: SeedProject['status'], tahun: number): Array<{ tanggal: string; persen: number }> {
  const count = status === 'selesai' ? 3 : 2;
  const step = Math.round(fisikPct / count);
  const persens = Array.from({ length: count }, (_, i) => Math.min(fisikPct, step * (i + 1)));
  persens[persens.length - 1] = fisikPct;

  const baseDate = new Date(`${tahun}-01-15T00:00:00`);
  return persens.map((persen, i) => {
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + (i + 1) * 3 + 1);
    return {
      tanggal: d.toISOString().split('T')[0],
      persen,
    };
  });
}

const RISK_BY_PROJECT: Record<number, RiskLevel> = {
  1: 'tinggi', 2: 'tinggi', 3: 'tinggi', 4: 'tinggi',
  5: 'perlu_perhatian', 6: 'perlu_perhatian', 7: 'perlu_perhatian', 8: 'perlu_perhatian',
  9: 'perlu_perhatian', 10: 'perlu_perhatian',
  11: 'tinggi', 12: 'tinggi',
  13: 'rendah',
};

function getScenarioParams(risk: RiskLevel): ScenarioParams {
  switch (risk) {
    case 'tinggi':
      return {
        acuanMargin: 0.22,
        menangFactor: 0.998,
        jumlah_penawar: 1,
        cair: 90,
        fisik: 50,
        hari_rup: 2,
        laporan: 3,
      };
    case 'perlu_perhatian':
      return {
        acuanMargin: 0.14,
        menangFactor: 0.98,
        jumlah_penawar: 2,
        cair: 75,
        fisik: 55,
        hari_rup: 10,
        laporan: 1,
      };
    case 'rendah':
      return {
        acuanMargin: -0.05,
        menangFactor: 0.95,
        jumlah_penawar: 5,
        cair: 60,
        fisik: 55,
        hari_rup: 30,
        laporan: 0,
      };
    default:
      throw new Error(`Skenario tidak dikenal: ${risk}`);
  }
}

function estimateHps(p: SeedProject): number {
  if (p.nilai_kontrak != null) return p.nilai_kontrak;
  const t = FINDINGS.find((x) => x.n === p.n);
  if (t) return Math.max(1_000_000_000, t.kelebihan_bayar_atau_kerugian * 10);
  return 5_000_000_000;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function uuid(n: number): string {
  return `11111111-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

async function clearPreviousRealSeed(): Promise<void> {
  const ids = PROJECTS.map((p) => uuid(p.n));
  for (const table of ['laporan_warga', 'indikator_temuan', 'pembayaran', 'progres', 'rab_item', 'tender', 'dokumen', 'prosedur_checklist']) {
    await pool.query(`DELETE FROM ${table} WHERE proyek_id = ANY($1::uuid[])`, [ids]);
  }
  await pool.query('DELETE FROM proyek WHERE id = ANY($1::uuid[])', [ids]);
}

async function clearDummySeed(): Promise<void> {
  for (const table of ['laporan_warga', 'indikator_temuan', 'pembayaran', 'progres', 'rab_item', 'tender', 'dokumen', 'prosedur_checklist']) {
    await pool.query(`DELETE FROM ${table} WHERE proyek_id IN (SELECT id FROM proyek WHERE is_dummy = true)`);
  }
  await pool.query('DELETE FROM proyek WHERE is_dummy = true');
}

async function run(): Promise<void> {
  await clearDummySeed();

  await clearPreviousRealSeed();
  await pool.query('DELETE FROM harga_acuan WHERE is_dummy = true');

  for (const w of REGIONS) {
    await pool.query(
      `INSERT INTO wilayah (kode_bps, nama, lat, lng) VALUES ($1,$2,$3,$4) ON CONFLICT (kode_bps) DO NOTHING`,
      [w.kode_bps, w.nama, w.lat, w.lng],
    );
  }
  for (const s of DATA_SOURCES) {
    await pool.query(
      `INSERT INTO sumber_data (source_id, nama, url, lisensi, atribusi, boleh_otomatis, last_fetched_at, row_count)
       VALUES ($1,$2,$3,$4,$5,false,now(),0) ON CONFLICT (source_id) DO NOTHING`,
      [s.source_id, s.nama, s.url, s.lisensi, s.atribusi],
    );
  }

  for (const p of PROJECTS) {
    const risk = RISK_BY_PROJECT[p.n];
    const scenario = getScenarioParams(risk);
    const hps = estimateHps(p);
    const pagu = Math.round(hps * 1.05);
    const rupAnnouncementDate = `${p.tahun}-01-15`;
    const rupCode = `RUP-${p.tahun}-${String(p.n).padStart(4, '0')}`;
    const tenderCode = `TDR-${p.tahun}-${String(p.n).padStart(4, '0')}`;
    const fundingSource = p.sumber_dana ?? 'APBD';
    const selectionMethod = hps >= 10_000_000_000 ? 'Tender Umum' : hps >= 1_000_000_000 ? 'Tender Terbatas' : 'Pengadaan Langsung';
    const contractValue = p.nilai_kontrak ?? hps;

    await pool.query(
      `INSERT INTO proyek
         (id, kode_rup, kode_tender, nama, dinas, kode_bps, tahun_anggaran,
          sumber_dana, metode_pemilihan, pagu, hps, nilai_kontrak, status,
          pengumuman_rup_tgl, match_status, source_id, source_url, fetched_at, is_dummy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'unmatched',$15,$16,now(),false)`,
      [
        uuid(p.n), rupCode, tenderCode, p.nama, p.dinas, p.kode_bps, p.tahun,
        fundingSource, selectionMethod, pagu, hps, contractValue, p.status,
        rupAnnouncementDate, p.source_id, p.source_url,
      ],
    );

    const referenceTotal = Math.round(hps / (1 + scenario.acuanMargin));

    // Seed harga acuan & item RAB yang lebih realistis (3-5 item per proyek)
    const rabSchedule = buildRabSchedule(referenceTotal, risk, p.n);
    for (const item of rabSchedule) {
      await pool.query(
        `INSERT INTO harga_acuan (kode, uraian, satuan, harga, kode_bps, tahun, source_id, is_dummy)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)
         ON CONFLICT (kode) DO UPDATE SET harga = EXCLUDED.harga`,
        [item.kode_acuan, item.uraian, item.satuan, item.harga_acuan, p.kode_bps, p.tahun, 'SRC-SEED'],
      );
      await pool.query(
        `INSERT INTO rab_item (proyek_id, uraian, satuan, volume, harga_satuan, kode_harga_acuan, source_id, is_dummy)
         VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
        [uuid(p.n), item.uraian, item.satuan, item.volume, item.harga_satuan, item.kode_acuan, 'SRC-SEED'],
      );
    }

    // Tender dummy agar D2 & D6 bisa dihitung
    const announcementDate = addDays(rupAnnouncementDate, scenario.hari_rup);
    const determinationDate = addDays(announcementDate, 7);
    await pool.query(
      `INSERT INTO tender (proyek_id, jumlah_peserta, jumlah_penawar, harga_penawaran_menang, tgl_pengumuman, tgl_penetapan, source_id, is_dummy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
      [
        uuid(p.n), scenario.jumlah_penawar, scenario.jumlah_penawar,
        Math.round(hps * scenario.menangFactor), announcementDate, determinationDate, 'SRC-SEED',
      ],
    );

    // Seed pembayaran termin (2-3 tahap) agar aliran dana & stages lebih realistis
    const paymentSchedule = buildPaymentSchedule(scenario.cair, p.status, p.tahun);
    for (const term of paymentSchedule) {
      await pool.query(
        `INSERT INTO pembayaran (proyek_id, termin_ke, tanggal, jumlah, persen_kontrak, source_id, is_dummy)
         VALUES ($1,$2,$3,$4,$5,$6,false)`,
        [uuid(p.n), term.termin_ke, term.tanggal, Math.round(contractValue * (term.persen / 100)), term.persen, 'SRC-SEED'],
      );
    }

    // Seed riwayat progres fisik (2-3 snapshot)
    const progressSchedule = buildProgressSchedule(scenario.fisik, p.status, p.tahun);
    for (const prog of progressSchedule) {
      await pool.query(
        `INSERT INTO progres (proyek_id, tanggal, persen_fisik, sumber, source_id, is_dummy)
         VALUES ($1,$2,$3,$4,$5,false)`,
        [uuid(p.n), prog.tanggal, prog.persen, 'verifikasi lapangan', 'SRC-SEED'],
      );
    }

    for (let i = 0; i < scenario.laporan; i += 1) {
      await pool.query(
        `INSERT INTO laporan_warga (tiket, proyek_id, kategori, keterangan, status, lat, lng)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (tiket) DO NOTHING`,
        [
          `LPR-${p.n}-${String(i + 1).padStart(3, '0')}`, uuid(p.n), 'Kualitas pekerjaan',
          `Laporan dummy ${i + 1} untuk proyek ${p.n}`, 'Diverifikasi', 0, 0,
        ],
      );
    }

    // Seed dokumen wajib publik untuk D5
    for (let i = 0; i < REQUIRED_DOCUMENTS.length; i += 1) {
      const d = REQUIRED_DOCUMENTS[i];
      await pool.query(
        `INSERT INTO dokumen (proyek_id, jenis, wajib, dipublikasikan, tanggal, source_id, is_dummy)
         VALUES ($1,$2,$3,$4,$5,$6,false)`,
        [
          uuid(p.n), d.jenis, d.wajib, isDocumentPublished(risk, i),
          `${p.tahun}-${String(2 + i).padStart(2, '0')}-01`, 'SRC-SEED',
        ],
      );
    }

    // Seed prosedur checklist untuk D6
    for (let i = 0; i < PROCEDURE_STEPS.length; i += 1) {
      const t = PROCEDURE_STEPS[i];
      await pool.query(
        `INSERT INTO prosedur_checklist (proyek_id, tahapan, terpenuhi, source_id, is_dummy)
         VALUES ($1,$2,$3,$4,false)`,
        [uuid(p.n), t.tahapan, isProcedureFulfilled(risk, i), 'SRC-SEED'],
      );
    }
  }

  for (const p of PROJECTS) {
    await recalculateProjectScore(pool, uuid(p.n));
  }
}

run()
  .then(async () => { await pool.end(); process.exit(0); })
  .catch(async (err) => { console.error('Seed gagal:', err); await pool.end(); process.exit(1); });

export { PROJECTS, FINDINGS };
