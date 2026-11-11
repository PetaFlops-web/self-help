import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../src/config/database.js';
import { recalculateProjectScore } from '../src/services/project-scoring.js';
import redisClient, { connectRedis } from '../src/config/redis.js';
import { invalidateCache } from '../src/middlewares/cache.js';
import { stripMediaMetadata } from '../src/helpers/media-metadata.js';
import { REPORT_UPLOAD_DIR } from '../src/middlewares/upload.js';

const SEED_MEDIA_PREFIX = 'seed-';
const ASSET_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assest');

const MEDIA_ASSETS: Array<{ file: string; mimetype: string; ext: string }> = [
  { file: 'WhatsApp Image 2026-11-01 at 17.36.11.jpeg', mimetype: 'image/jpeg', ext: '.jpg' },
  { file: 'WhatsApp Image 2026-11-01 at 17.36.12.jpeg', mimetype: 'image/jpeg', ext: '.jpg' },
  { file: 'WhatsApp Video 2026-11-01 at 17.36.11.mp4', mimetype: 'video/mp4', ext: '.mp4' },
];

function clearSeededMediaFiles(): void {
  if (!existsSync(REPORT_UPLOAD_DIR)) {
    mkdirSync(REPORT_UPLOAD_DIR, { recursive: true });
    return;
  }
  for (const name of readdirSync(REPORT_UPLOAD_DIR)) {
    if (name.startsWith(SEED_MEDIA_PREFIX)) {
      unlinkSync(path.join(REPORT_UPLOAD_DIR, name));
    }
  }
}

function writeSeedMediaFile(asset: { file: string; mimetype: string; ext: string }): string {
  const raw = readFileSync(path.join(ASSET_DIR, asset.file));
  const clean = stripMediaMetadata(raw, asset.mimetype);
  const name = `${SEED_MEDIA_PREFIX}${Date.now()}-${randomBytes(8).toString('hex')}${asset.ext}`;
  writeFileSync(path.join(REPORT_UPLOAD_DIR, name), clean);
  return `/uploads/reports/${name}`;
}

const REGIONS = [
  { kode_bps: '1801', nama: 'Lampung Selatan', lat: -5.65, lng: 105.62 },
  { kode_bps: '1802', nama: 'Lampung Tengah', lat: -4.88, lng: 105.21 },
  { kode_bps: '1803', nama: 'Lampung Utara', lat: -4.82, lng: 104.8 },
  { kode_bps: '1804', nama: 'Lampung Barat', lat: -5.02, lng: 104.06 },
  { kode_bps: '1805', nama: 'Tulang Bawang', lat: -4.47, lng: 105.3 },
  { kode_bps: '1806', nama: 'Tanggamus', lat: -5.35, lng: 104.67 },
  { kode_bps: '1807', nama: 'Lampung Timur', lat: -5.11, lng: 105.68 },
  { kode_bps: '1808', nama: 'Way Kanan', lat: -4.52, lng: 104.55 },
  { kode_bps: '1809', nama: 'Pesawaran', lat: -5.43, lng: 105.08 },
  { kode_bps: '1810', nama: 'Mesuji', lat: -4.0, lng: 105.1 },
  { kode_bps: '1811', nama: 'Tulang Bawang Barat', lat: -4.44, lng: 105.04 },
  { kode_bps: '1812', nama: 'Pesisir Barat', lat: -5.19, lng: 103.94 },
  { kode_bps: '1813', nama: 'Pringsewu', lat: -5.36, lng: 104.98 },
  { kode_bps: '1871', nama: 'Kota Bandar Lampung', lat: -5.45, lng: 105.27 },
  { kode_bps: '1872', nama: 'Kota Metro', lat: -5.11, lng: 105.31 },
];

const DATA_SOURCES = [
  { source_id: 'SRC-01', nama: 'SiRUP LKPP (sirup.inaproc.id)', url: 'https://sirup.inaproc.id', lisensi: 'Publik', atribusi: 'LKPP RI' },
  { source_id: 'SRC-02', nama: 'LPSE Provinsi Lampung dan kabupaten/kota (SPSE)', url: 'https://lpse.lampungprov.go.id', lisensi: 'Publik', atribusi: 'LPSE Lampung' },
  { source_id: 'SRC-03', nama: 'INAPROC / data pengadaan LKPP', url: 'https://inaproc.id', lisensi: 'Publik', atribusi: 'LKPP RI' },
  { source_id: 'SRC-04', nama: 'Data APBD (DJPK Kemenkeu, SIPD Kemendagri, BPKAD daerah)', url: 'https://www.djpk.kemenkeu.go.id', lisensi: 'Publik', atribusi: 'DJPK Kemenkeu RI' },
  { source_id: 'SRC-05', nama: 'BPS Provinsi Lampung', url: 'https://lampung.bps.go.id', lisensi: 'Publik', atribusi: 'BPS RI' },
  { source_id: 'SRC-06', nama: 'LHP BPK RI Perwakilan Provinsi Lampung (via pemberitaan)', url: 'https://lampung.bpk.go.id', lisensi: 'Publik', atribusi: 'BPK RI' },
  { source_id: 'SRC-07', nama: 'Standar harga satuan (SBU/HSPK/HSD) pemda dan Kementerian PU', url: 'https://pu.go.id', lisensi: 'Publik', atribusi: 'Kementerian PU RI' },
  { source_id: 'SRC-08', nama: 'Batas wilayah administrasi (BIG, geoBoundaries, OpenStreetMap)', url: 'https://www.openstreetmap.org', lisensi: 'Open Data Commons ODbL', atribusi: 'OpenStreetMap contributors, BIG RI', boleh_otomatis: true },
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
    n: 1, nama: 'Pembangunan Embung Kemiling', dinas: 'Dinas PSDA Provinsi Lampung',
    kode_bps: '1871', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 6_980_867_932, status: 'selesai',
    penyedia: 'CV Raden Galuh', source_id: 'SRC-06',
    source_url: 'https://www.inilampung.com/2026/08/temuan-bpk-di-proyek-embung-kemiling.html',
  },
  {
    n: 2, nama: 'Perkuatan Tebing Sungai Way Paku II Tahap I', dinas: 'Dinas PSDA Provinsi Lampung',
    kode_bps: '1806', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 6_726_163_893, status: 'selesai',
    penyedia: 'CV BC', source_id: 'SRC-06',
    source_url: 'https://www.inilampung.com/2026/07/dprd-lampung-heran-proyek-rp67-m-kurang.html',
  },
  {
    n: 3, nama: 'Perkuatan Tebing Sungai Way Paku I Tahap I', dinas: 'Dinas PSDA Provinsi Lampung',
    kode_bps: '1806', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 5_630_539_633, status: 'selesai',
    penyedia: 'CV GPJ', source_id: 'SRC-06',
    source_url: 'https://www.inilampung.com/2026/07/dprd-lampung-heran-proyek-rp67-m-kurang.html',
  },
  {
    n: 4, nama: 'Perkuatan Tebing Sungai Pekon Gunung Kasih', dinas: 'Dinas PSDA Provinsi Lampung',
    kode_bps: '1806', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 2_207_805_658, status: 'selesai',
    penyedia: 'CV AS', source_id: 'SRC-06',
    source_url: 'https://www.inilampung.com/2026/07/dprd-lampung-heran-proyek-rp67-m-kurang.html',
  },
  {
    n: 5, nama: 'Rekonstruksi Jalan Bujung Tenuk - Penumangan', dinas: 'Dinas BMBK Provinsi Lampung',
    kode_bps: '1805', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 6_468_760_410, status: 'selesai',
    penyedia: 'PT BMBK Karya Utama', source_id: 'SRC-06',
    source_url: 'https://sinarlampung.co/2026/08/31/temuan-bpk-10-proyek-jalan-dinas-bmbk-lampung-bermasalah-kelebihan-bayar-tembus-rp27-miliar/',
  },
  {
    n: 6, nama: 'Rekonstruksi Jalan Simpang Empat - Kasui', dinas: 'Dinas BMBK Provinsi Lampung',
    kode_bps: '1808', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 4_923_673_660, status: 'selesai',
    penyedia: 'PT Simpang Empat Mandiri', source_id: 'SRC-06',
    source_url: 'https://sinarlampung.co/2026/08/31/temuan-bpk-10-proyek-jalan-dinas-bmbk-lampung-bermasalah-kelebihan-bayar-tembus-rp27-miliar/',
  },
  {
    n: 7, nama: 'Rekonstruksi Jalan Tajab - Adi Jaya', dinas: 'Dinas BMBK Provinsi Lampung',
    kode_bps: '1808', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 4_853_298_300, status: 'selesai',
    penyedia: 'PT Tajab Jaya', source_id: 'SRC-06',
    source_url: 'https://sinarlampung.co/2026/08/31/temuan-bpk-10-proyek-jalan-dinas-bmbk-lampung-bermasalah-kelebihan-bayar-tembus-rp27-miliar/',
  },
  {
    n: 8, nama: 'Rekonstruksi Jalan Ketapang - Negara Ratu', dinas: 'Dinas BMBK Provinsi Lampung',
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
    kode_bps: '1803', tahun: 2019, sumber_dana: 'APBD', nilai_kontrak: 3_350_000_000, status: 'selesai',
    penyedia: 'CV Al Fath Hakiki', source_id: 'SRC-14',
    source_url: 'https://www.detik.com/sumbagsel/hukum-dan-kriminal/d-8696588/8-kontraktor-yang-korupsi-proyek-jalan-di-lampung-utara-ditahan',
  },
  {
    n: 11, nama: 'Pembangunan Jalan Tol Terbanggi Besar - Pematang Panggang - Kayu Agung', dinas: 'Project Jalan Tol Trans Sumatera',
    kode_bps: '1810', tahun: 2017, sumber_dana: 'APBN', nilai_kontrak: 1_253_922_600_000, status: 'selesai',
    penyedia: 'PT Waskita Karya (Persero) Tbk', source_id: 'SRC-14',
    source_url: 'https://www.detik.com/sumbagsel/hukum-dan-kriminal/d-7872001/kejati-ungkap-korupsi-pembangunan-jalan-tol-lampung-negara-rugi-rp-66-m',
  },
  {
    n: 12, nama: 'Pembukaan Badan Jalan Pekon Bambang - Batubulan', dinas: 'Dinas PUPR Kabupaten Pesisir Barat',
    kode_bps: '1812', tahun: 2022, sumber_dana: 'DID', nilai_kontrak: 4_410_000_000, status: 'selesai',
    penyedia: 'PT Citra Primadona Perkasa', source_id: 'SRC-14',
    source_url: 'https://www.liputan6.com/regional/read/5823094/kejati-lampung-tetapkan-tiga-tersangka-kasus-korupsi-pekerjaan-jalan-di-pesisir-barat-senilai-rp13-m',
  },
  {
    n: 13, nama: 'Rehabilitasi Jalan Kampung Jawa - Sukanegara', dinas: 'Dinas PUPR Kabupaten Pesisir Barat',
    kode_bps: '1812', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 2_130_032_837, status: 'pelaksanaan',
    penyedia: 'CV Pukem Konstruksi', source_id: 'SRC-11',
    source_url: 'https://www.megarajawali.com/2026/08/tiga-paket-jalan-pupr-pesibar-belum.html',
  },
  {
    n: 14, nama: 'Rekonstruksi Jalan Kalirejo - Pringsewu', dinas: 'Dinas BMBK Provinsi Lampung',
    kode_bps: '1813', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 12_650_667_000, status: 'selesai',
    penyedia: 'PT Manunggal Sulthon Raya', source_id: 'SRC-06',
    source_url: 'https://spse.inaproc.id/lampungprov',
  },
  {
    n: 15, nama: 'Rekonstruksi Jalan Padang Ratu - Kalirejo', dinas: 'Dinas BMBK Provinsi Lampung',
    kode_bps: '1802', tahun: 2025, sumber_dana: 'DBH Sawit', nilai_kontrak: 5_529_898_425, status: 'selesai',
    penyedia: 'CV Rafandra Perdana', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungprov',
  },
  {
    n: 16, nama: 'Rekonstruksi Jalan Bandar Jaya - Sp. Mandala', dinas: 'Dinas BMBK Provinsi Lampung',
    kode_bps: '1802', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 12_964_714_773, status: 'selesai',
    penyedia: 'CV Uzza Agil Konstruksi', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungprov',
  },
  {
    n: 17, nama: 'Pembangunan Jalan Tol Bakauheni - Terbanggi Besar Paket 1', dinas: 'Project Jalan Tol Trans Sumatera',
    kode_bps: '1801', tahun: 2017, sumber_dana: 'APBN', nilai_kontrak: 1_130_000_000_000, status: 'selesai',
    penyedia: 'PT PP (Persero) Tbk', source_id: 'SRC-13',
    source_url: 'https://pu.go.id',
  },
  {
    n: 18, nama: 'Peningkatan Jalan Marang - Kupang Ulu', dinas: 'Dinas PUPR Kabupaten Pesisir Barat',
    kode_bps: '1812', tahun: 2022, sumber_dana: 'APBD', nilai_kontrak: 6_000_000_000, status: 'selesai',
    penyedia: 'CV Fhorist Asror Agung', source_id: 'SRC-14',
    source_url: 'https://www.idntimes.com',
  },
  {
    n: 19, nama: 'Peningkatan Jalan Kamboja Pekon Kampung Jawa', dinas: 'Dinas PUPR Kabupaten Pesisir Barat',
    kode_bps: '1812', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 494_892_625, status: 'selesai',
    penyedia: 'CV Rimbun Embun', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/pesisirbaratkab',
  },
  {
    n: 20, nama: 'Pembukaan Badan Jalan Menuju Batalyon', dinas: 'Dinas PUPR Kabupaten Pesisir Barat',
    kode_bps: '1812', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 297_882_208, status: 'selesai',
    penyedia: 'CV Berlian Hitam', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/pesisirbaratkab',
  },
  {
    n: 21, nama: 'Penyusunan Harga Satuan Konstruksi Semester 2', dinas: 'Dinas PUPR Kabupaten Pesisir Barat',
    kode_bps: '1812', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 79_121_910, status: 'selesai',
    penyedia: 'RC Consultant', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/pesisirbaratkab',
  },
  {
    n: 22, nama: 'Peningkatan Jalan Dusun Taman Sari', dinas: 'Dinas PUPR Kabupaten Lampung Selatan',
    kode_bps: '1801', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 398_222_620, status: 'selesai',
    penyedia: 'CV Way Pisang', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungselatankab',
  },
  {
    n: 23, nama: 'Pembangunan Jalan Rabat Beton Way Gelam - Balinuraga', dinas: 'Dinas PUPR Kabupaten Lampung Selatan',
    kode_bps: '1801', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 2_483_516_923, status: 'selesai',
    penyedia: 'CV Dwi Baskoro', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungselatankab',
  },
  {
    n: 24, nama: 'Rekonstruksi Jalan Kota Dalam - Budi Daya', dinas: 'Dinas PUPR Kabupaten Lampung Selatan',
    kode_bps: '1801', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 2_000_000_000, status: 'selesai',
    penyedia: 'CV Abdi Karya Pratama', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungselatankab',
  },
  {
    n: 25, nama: 'Rekonstruksi Jalan Sukabanjar - Suak', dinas: 'Dinas PUPR Kabupaten Lampung Selatan',
    kode_bps: '1801', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 5_000_000_000, status: 'selesai',
    penyedia: 'CV Batin Alam Perkasa', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungselatankab',
  },
  {
    n: 26, nama: 'Rekonstruksi Jalan Ruas Puji Rahayu - Tanjung Harapan', dinas: 'Dinas PUPR Kabupaten Lampung Selatan',
    kode_bps: '1801', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 4_946_652_242, status: 'pelaksanaan',
    penyedia: 'CV Tama Grup', source_id: 'SRC-11',
    source_url: 'https://koranlampung.id',
  },
  {
    n: 27, nama: 'Rekonstruksi Jalan Pardasuka - Suban', dinas: 'Dinas PUPR Kabupaten Lampung Selatan',
    kode_bps: '1801', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 7_900_000_000, status: 'pelaksanaan',
    penyedia: 'CV Adie Jaya Perkasa', source_id: 'SRC-11',
    source_url: 'https://pikiranlampung.com',
  },
  {
    n: 28, nama: 'Pemeliharaan Berkala Jalan Ruas Kali Bening - Wonosari', dinas: 'Dinas PUPR Kabupaten Lampung Timur',
    kode_bps: '1807', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 197_102_391, status: 'selesai',
    penyedia: 'CV Biru Langit', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungtimurkab',
  },
  {
    n: 29, nama: 'Rehabilitasi Masjid dan Aula Islamic Center Lampung Timur', dinas: 'Dinas PUPR Kabupaten Lampung Timur',
    kode_bps: '1807', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 398_999_154, status: 'selesai',
    penyedia: 'CV Asia Bangun', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungtimurkab',
  },
  {
    n: 30, nama: 'Peningkatan Jalan Ruas Jepara - Sri Pendowo', dinas: 'Dinas PUPR Kabupaten Lampung Timur',
    kode_bps: '1807', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 996_000_000, status: 'selesai',
    penyedia: 'CV Bungo Padi', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungtimurkab',
  },
  {
    n: 31, nama: 'Peningkatan Jalan Desa Taman Fajar', dinas: 'Dinas PUPR Kabupaten Lampung Timur',
    kode_bps: '1807', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 489_000_000, status: 'selesai',
    penyedia: 'CV Bunga Mayang Putra', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungtimurkab',
  },
  {
    n: 32, nama: 'Preservasi Ruas Jalan Braja Sakti - Sriminosari', dinas: 'Dinas PUPR Kabupaten Lampung Timur',
    kode_bps: '1807', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 55_320_900_347, status: 'pelaksanaan',
    penyedia: 'PT Karang Baru', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungtimurkab',
  },
  {
    n: 33, nama: 'Peningkatan Jalan Ruas Sumber Rejo - Sidorahayu', dinas: 'Dinas PUPR Kabupaten Lampung Timur',
    kode_bps: '1807', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 2_706_966_135, status: 'selesai',
    penyedia: 'CV Sembahen Jaya', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungtimurkab',
  },
  {
    n: 34, nama: 'Rekonstruksi Peningkatan Ruas Jalan Pakuan Aji', dinas: 'Dinas PUPR Kabupaten Lampung Timur',
    kode_bps: '1807', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 1_400_000_000, status: 'selesai',
    penyedia: 'CV Putri Kembar Sejahtera', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungtimurkab',
  },
  {
    n: 35, nama: 'Peningkatan Jalan Ruas Dalam Kota Sukadana', dinas: 'Dinas PUPR Kabupaten Lampung Timur',
    kode_bps: '1807', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 17_453_010_000, status: 'selesai',
    penyedia: 'PT Parosai', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungtimurkab',
  },
  {
    n: 36, nama: 'Peningkatan Jalan Sumber Rejo - Putra Aji I', dinas: 'Dinas PUPR Kabupaten Lampung Timur',
    kode_bps: '1807', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 12_209_580_000, status: 'selesai',
    penyedia: 'PT Bumi Perkasa Kalipuncur', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungtimurkab',
  },
  {
    n: 37, nama: 'Pembangunan Drainase Jl. Perjuangan', dinas: 'Dinas PU Kota Bandar Lampung',
    kode_bps: '1871', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 160_237_275, status: 'selesai',
    penyedia: 'CV Anugrah Karya', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/bandarlampungkota',
  },
  {
    n: 38, nama: 'Pembangunan Drainase Jl. Pulau Madura', dinas: 'Dinas PU Kota Bandar Lampung',
    kode_bps: '1871', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 710_400_000, status: 'selesai',
    penyedia: 'CV Rara Bangun Sarana', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/bandarlampungkota',
  },
  {
    n: 39, nama: 'Pembangunan Drainase Jl. P. Singkep 7', dinas: 'Dinas PU Kota Bandar Lampung',
    kode_bps: '1871', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 694_429_906, status: 'selesai',
    penyedia: 'CV Dua Ribu Lima', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/bandarlampungkota',
  },
  {
    n: 40, nama: 'Pembangunan Drainase Jl. P. Singkep Gg. AMD', dinas: 'Dinas PU Kota Bandar Lampung',
    kode_bps: '1871', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 760_661_041, status: 'selesai',
    penyedia: 'CV Tunas Jaya', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/bandarlampungkota',
  },
  {
    n: 41, nama: 'Rehabilitasi Ruang Kelas SDN 3 Segala Mider', dinas: 'Dinas Pendidikan dan Kebudayaan Kota Bandar Lampung',
    kode_bps: '1871', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 349_885_000, status: 'selesai',
    penyedia: 'CV Goro Jaya Pratama', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/bandarlampungkota',
  },
  {
    n: 42, nama: 'Rehabilitasi Ruang Kelas SDN 4 Sumber Rejo', dinas: 'Dinas Pendidikan dan Kebudayaan Kota Bandar Lampung',
    kode_bps: '1871', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 349_894_000, status: 'selesai',
    penyedia: 'CV Delapan Saudara', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/bandarlampungkota',
  },
  {
    n: 43, nama: 'Pembangunan Bronjong Jl. Giri Loyo', dinas: 'Dinas PUTR Kota Metro',
    kode_bps: '1872', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 197_612_979, status: 'selesai',
    penyedia: 'CV Rajasa Nagara', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/metrokota',
  },
  {
    n: 44, nama: 'Pembangunan Talud Anak Sungai Way Batanghari', dinas: 'Dinas PUTR Kota Metro',
    kode_bps: '1872', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 99_222_387, status: 'selesai',
    penyedia: 'CV Metro Gemilang', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/metrokota',
  },
  {
    n: 45, nama: 'Pembangunan Jalan Pingled Kelurahan Banjarsari', dinas: 'Dinas PUTR Kota Metro',
    kode_bps: '1872', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 99_155_000, status: 'selesai',
    penyedia: 'CV Lampung Jaya Abadi', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/metrokota',
  },
  {
    n: 46, nama: 'Peningkatan Ruas Jalan Kubu Batu - Kota Jawa', dinas: 'Dinas PUPR Kabupaten Pesawaran',
    kode_bps: '1809', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 11_964_350_200, status: 'selesai',
    penyedia: 'CV Aulia Pratama', source_id: 'SRC-06',
    source_url: 'https://spse.inaproc.id/pesawarankab',
  },
  {
    n: 47, nama: 'Peningkatan Ruas Jalan Halangan Ratu - Tugu Sari', dinas: 'Dinas PUPR Kabupaten Pesawaran',
    kode_bps: '1809', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 398_062_000, status: 'selesai',
    penyedia: 'CV Shafira Berkah Abadi', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/pesawarankab',
  },
  {
    n: 48, nama: 'Pasangan Siring Talut Desa Sukamaju', dinas: 'Dinas PUPR Kabupaten Pesawaran',
    kode_bps: '1809', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 250_000_000, status: 'selesai',
    penyedia: 'CV Arus Mudi Lapay', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/pesawarankab',
  },
  {
    n: 49, nama: 'Rehabilitasi Ruang Kelas SDN 1 Bengkulu Tengah', dinas: 'Dinas Pendidikan dan Kebudayaan Kabupaten Way Kanan',
    kode_bps: '1808', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 218_081_056, status: 'selesai',
    penyedia: 'CV Putra Bahuga', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/waykanankab',
  },
  {
    n: 50, nama: 'Rehabilitasi Ruang Kelas SDN 01 Tanjung Sari', dinas: 'Dinas Pendidikan dan Kebudayaan Kabupaten Way Kanan',
    kode_bps: '1808', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 243_452_318, status: 'selesai',
    penyedia: 'CV Echa Bersaudara', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/waykanankab',
  },
  {
    n: 51, nama: 'Rehabilitasi Ruang Kelas SMPN 2 Negeri Besar', dinas: 'Dinas Pendidikan dan Kebudayaan Kabupaten Way Kanan',
    kode_bps: '1808', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 271_117_810, status: 'selesai',
    penyedia: 'CV Trisakti', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/waykanankab',
  },
  {
    n: 52, nama: 'Pembangunan Rumah Dinas Kasi Kejari Way Kanan', dinas: 'Dinas PUPR Kabupaten Way Kanan',
    kode_bps: '1808', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 350_000_000, status: 'selesai',
    penyedia: 'PT Berkat Anugerah Konstruksi', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/waykanankab',
  },
  {
    n: 53, nama: 'Pengawasan Jalan Kecamatan Buay Bahuga', dinas: 'Dinas PUPR Kabupaten Way Kanan',
    kode_bps: '1808', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 99_940_182, status: 'selesai',
    penyedia: 'CV Trijaya Waskita', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/waykanankab',
  },
  {
    n: 54, nama: 'Pengawasan Komplek Perkantoran Kejari Way Kanan', dinas: 'Dinas PUPR Kabupaten Way Kanan',
    kode_bps: '1808', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 99_840_060, status: 'selesai',
    penyedia: 'PT Manunggal Raksa Pratama', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/waykanankab',
  },
  {
    n: 55, nama: 'Pengawasan Jalan dan Saluran Drainase Kecamatan Bumi Agung', dinas: 'Dinas PUPR Kabupaten Way Kanan',
    kode_bps: '1808', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 99_926_418, status: 'selesai',
    penyedia: 'CV Mega Cakra Persada Engineering', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/waykanankab',
  },
  {
    n: 56, nama: 'Pembangunan Pagar Panel Beton RS Rawajitu Utara', dinas: 'Dinas PUPR Kabupaten Mesuji',
    kode_bps: '1810', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 295_036_000, status: 'selesai',
    penyedia: 'CV Mayzhafit Family', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/mesujikab',
  },
  {
    n: 57, nama: 'Perencanaan Peningkatan Jaringan Irigasi Daerah Irigasi', dinas: 'Dinas PUPR Kabupaten Mesuji',
    kode_bps: '1810', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 88_422_139, status: 'selesai',
    penyedia: 'CV Trimitra Jaya Konsultan', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/mesujikab',
  },
  {
    n: 58, nama: 'Penyusunan Dokumen Rencana Induk RISPAL Kabupaten Mesuji', dinas: 'Dinas PUPR Kabupaten Mesuji',
    kode_bps: '1810', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 99_234_000, status: 'selesai',
    penyedia: 'CV Garisan Inti', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/mesujikab',
  },
  {
    n: 59, nama: 'Perencanaan Ruas Jalan KTM - Tj. Mas Jaya', dinas: 'Dinas PUPR Kabupaten Mesuji',
    kode_bps: '1810', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 89_845_620, status: 'selesai',
    penyedia: 'CV MJB Konsultan', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/mesujikab',
  },
  {
    n: 60, nama: 'Rehabilitasi Puskesmas Rawajitu Timur', dinas: 'Dinas PUPR Kabupaten Tulang Bawang',
    kode_bps: '1805', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 199_981_253, status: 'selesai',
    penyedia: 'CV Citra Buana', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/tulangbawangkab',
  },
  {
    n: 61, nama: 'Pengawasan Rehabilitasi Kantor Kejaksaan Negeri Tulang Bawang', dinas: 'Dinas PUPR Kabupaten Tulang Bawang',
    kode_bps: '1805', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 39_999_999, status: 'selesai',
    penyedia: 'CV Widya Kreasi', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/tulangbawangkab',
  },
  {
    n: 62, nama: 'Rehabilitasi Anjungan Kabupaten Tulang Bawang Barat', dinas: 'Dinas PUPR Kabupaten Tulang Bawang Barat',
    kode_bps: '1811', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 397_723_672, status: 'selesai',
    penyedia: 'CV Akbar Brother Mandiri', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/tulangbawangbaratkab',
  },
  {
    n: 63, nama: 'Pengadaan Bahan Material Ruas Jalan 017', dinas: 'Dinas PUPR Kabupaten Tulang Bawang Barat',
    kode_bps: '1811', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 73_016_739, status: 'selesai',
    penyedia: 'CV Stek Harmoni', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/tulangbawangbaratkab',
  },
  {
    n: 64, nama: 'Peningkatan Jalan Mutar Alam - Gunung Terang', dinas: 'Dinas PUPR Kabupaten Lampung Barat',
    kode_bps: '1804', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 275_992_000, status: 'selesai',
    penyedia: 'CV Sattya Alam Kencana', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungbaratkab',
  },
  {
    n: 65, nama: 'Pembangunan Jalan Teba Pring - Sedampah', dinas: 'Dinas PUPR Kabupaten Lampung Barat',
    kode_bps: '1804', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 399_999_000, status: 'selesai',
    penyedia: 'PT Pangeran Timur Konstruksi', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungbaratkab',
  },
  {
    n: 66, nama: 'Peningkatan Jalan Lingkungan Pekon Kamilin 1', dinas: 'Dinas PUPR Kabupaten Pringsewu',
    kode_bps: '1813', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 198_492_953, status: 'selesai',
    penyedia: 'CV Satrio Jaya Pringsewu', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/pringsewukab',
  },
  {
    n: 67, nama: 'Pengadaan Bahan Material Ruas Jalan Pasar Pringsewu - Pringsewu Timur', dinas: 'Dinas PUPR Kabupaten Pringsewu',
    kode_bps: '1813', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 131_018_362, status: 'selesai',
    penyedia: 'CV Sewu Tiga Perkasa', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/pringsewukab',
  },
  {
    n: 68, nama: 'Pengadaan Bahan Material Ruas Jalan Pringsewu Timur - Marga Kaya', dinas: 'Dinas PUPR Kabupaten Pringsewu',
    kode_bps: '1813', tahun: 2024, sumber_dana: 'APBD', nilai_kontrak: 192_317_512, status: 'selesai',
    penyedia: 'CV Sewu Tiga Perkasa', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/pringsewukab',
  },
  {
    n: 69, nama: 'Rehabilitasi Ruang Fraksi PKB DPRD Provinsi Lampung', dinas: 'Dinas PKPCK Provinsi Lampung',
    kode_bps: '1871', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 199_403_015, status: 'selesai',
    penyedia: 'CV Minak Sempurna Jaya', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungprov',
  },
  {
    n: 70, nama: 'Pembangunan Jalan Desa Karang Rejo', dinas: 'Dinas PKPCK Provinsi Lampung',
    kode_bps: '1801', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 199_340_445, status: 'selesai',
    penyedia: 'CV Serumpun', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungprov',
  },
  {
    n: 71, nama: 'Pembangunan Jalan Pekon Terbaya', dinas: 'Dinas PKPCK Provinsi Lampung',
    kode_bps: '1806', tahun: 2025, sumber_dana: 'APBD', nilai_kontrak: 199_280_501, status: 'selesai',
    penyedia: 'CV Tama Group', source_id: 'SRC-02',
    source_url: 'https://spse.inaproc.id/lampungprov',
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
  const count = 3 + (projectNum % 3);
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
  9: 'perlu_perhatian', 10: 'perlu_perhatian', 11: 'tinggi', 12: 'tinggi',
  13: 'rendah', 14: 'perlu_perhatian', 15: 'perlu_perhatian', 16: 'perlu_perhatian',
  17: 'perlu_perhatian', 18: 'tinggi', 19: 'rendah', 20: 'rendah',
  21: 'rendah', 22: 'rendah', 23: 'rendah', 24: 'rendah',
  25: 'rendah', 26: 'perlu_perhatian', 27: 'perlu_perhatian', 28: 'rendah',
  29: 'rendah', 30: 'rendah', 31: 'rendah', 32: 'perlu_perhatian',
  33: 'perlu_perhatian', 34: 'perlu_perhatian', 35: 'perlu_perhatian', 36: 'perlu_perhatian',
  37: 'rendah', 38: 'rendah', 39: 'rendah', 40: 'rendah',
  41: 'perlu_perhatian', 42: 'perlu_perhatian', 43: 'rendah', 44: 'rendah',
  45: 'rendah', 46: 'tinggi', 47: 'tinggi', 48: 'tinggi',
  49: 'rendah', 50: 'rendah', 51: 'rendah', 52: 'rendah',
  53: 'rendah', 54: 'rendah', 55: 'rendah', 56: 'rendah',
  57: 'rendah', 58: 'rendah', 59: 'rendah', 60: 'perlu_perhatian',
  61: 'perlu_perhatian', 62: 'perlu_perhatian', 63: 'perlu_perhatian', 64: 'perlu_perhatian',
  65: 'perlu_perhatian', 66: 'tinggi', 67: 'tinggi', 68: 'tinggi',
  69: 'tinggi', 70: 'tinggi', 71: 'tinggi',
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
        laporan: 1,
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

const RUNNER_UP_COMPANIES = [
  'PT Graha Nusa Lampung',
  'CV Siger Konstruksi',
  'PT Way Halim Teknik',
  'CV Krakatau Mandiri',
];

function hashDummyCompanyTaxId(companyName: string): string {
  return createHash('sha256').update(`dummy-npwp:${companyName.trim().toLowerCase()}`).digest('hex');
}

async function upsertDummyCompany(
  cache: Map<string, string>,
  namaBadanUsaha: string,
  sourceUrl: string,
): Promise<string> {
  const key = namaBadanUsaha.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM perusahaan WHERE lower(trim(nama_badan_usaha)) = $1 LIMIT 1',
    [key],
  );
  if (existing.rows[0]) {
    cache.set(key, existing.rows[0].id);
    return existing.rows[0].id;
  }

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO perusahaan (nama_badan_usaha, npwp_hash, source_id, source_url, fetched_at, is_dummy)
     VALUES ($1, $2, 'SRC-02', $3, now(), true)
     RETURNING id`,
    [namaBadanUsaha.trim(), hashDummyCompanyTaxId(namaBadanUsaha), sourceUrl],
  );
  cache.set(key, inserted.rows[0].id);
  return inserted.rows[0].id;
}

async function seedDepartmentBudgets(): Promise<void> {
  const groups = new Map<string, { dinas: string; kode_bps: string; tahun: number; totalPagu: number; risk: RiskLevel }>();
  for (const p of PROJECTS) {
    const key = `${p.dinas}::${p.kode_bps}::${p.tahun}`;
    const pagu = Math.round(estimateHps(p) * 1.05);
    const existing = groups.get(key);
    if (existing) {
      existing.totalPagu += pagu;
    } else {
      groups.set(key, {
        dinas: p.dinas,
        kode_bps: p.kode_bps,
        tahun: p.tahun,
        totalPagu: pagu,
        risk: RISK_BY_PROJECT[p.n],
      });
    }
  }

  for (const g of groups.values()) {
    const growthPct = g.risk === 'tinggi' ? 45 : g.risk === 'perlu_perhatian' ? 28 : 10;
    const paguPrev = Math.max(1_000_000_000, Math.round((g.totalPagu * 1.5) / 1000) * 1000);
    const paguCurr = Math.round((paguPrev * (100 + growthPct)) / 100);
    const entries = [
      { tahun: g.tahun - 1, pagu: paguPrev, realisasi: Math.round(paguPrev * 0.92) },
      { tahun: g.tahun, pagu: paguCurr, realisasi: Math.round(paguCurr * 0.85) },
    ];
    for (const e of entries) {
      await pool.query(
        `INSERT INTO anggaran_dinas (dinas, kode_bps, tahun, pagu, realisasi, source_id, source_url, fetched_at, is_dummy)
         VALUES ($1, $2, $3, $4, $5, 'SRC-04', 'https://www.djpk.kemenkeu.go.id', now(), true)
         ON CONFLICT (dinas, kode_bps, tahun) DO UPDATE SET
           pagu = EXCLUDED.pagu,
           realisasi = EXCLUDED.realisasi,
           source_id = EXCLUDED.source_id,
           source_url = EXCLUDED.source_url,
           fetched_at = EXCLUDED.fetched_at,
           is_dummy = EXCLUDED.is_dummy`,
        [g.dinas, g.kode_bps, e.tahun, e.pagu, e.realisasi],
      );
    }
  }
}

async function clearPreviousRealSeed(): Promise<void> {
  const existingRes = await pool.query<{ id: string }>(
    `SELECT id FROM proyek WHERE id = ANY($1::uuid[]) OR id::text LIKE '11111111-0000-4000-8000-%'`,
    [PROJECTS.map((p) => uuid(p.n))],
  );
  const ids = Array.from(new Set([...PROJECTS.map((p) => uuid(p.n)), ...existingRes.rows.map((r) => r.id)]));
  if (ids.length === 0) return;
  await pool.query('DELETE FROM proyek_pencocokan WHERE proyek_id = ANY($1::uuid[]) OR pasangan_id = ANY($1::uuid[])', [ids]);
  await pool.query('DELETE FROM riwayat_nilai WHERE proyek_id = ANY($1::uuid[])', [ids]);
  await pool.query('DELETE FROM peserta_tender WHERE tender_id IN (SELECT id FROM tender WHERE proyek_id = ANY($1::uuid[]))', [ids]);
  for (const table of ['laporan_warga', 'indikator_temuan', 'penjelasan_llm', 'pembayaran', 'progres', 'rab_item', 'tender', 'dokumen', 'prosedur_checklist']) {
    await pool.query(`DELETE FROM ${table} WHERE proyek_id = ANY($1::uuid[])`, [ids]);
  }
  await pool.query('DELETE FROM proyek WHERE id = ANY($1::uuid[])', [ids]);
}

async function clearDummySeed(): Promise<void> {
  await pool.query('DELETE FROM proyek_pencocokan WHERE proyek_id IN (SELECT id FROM proyek WHERE is_dummy = true) OR pasangan_id IN (SELECT id FROM proyek WHERE is_dummy = true)');
  await pool.query('DELETE FROM riwayat_nilai WHERE proyek_id IN (SELECT id FROM proyek WHERE is_dummy = true)');
  await pool.query('DELETE FROM peserta_tender WHERE is_dummy = true OR tender_id IN (SELECT id FROM tender WHERE proyek_id IN (SELECT id FROM proyek WHERE is_dummy = true))');
  for (const table of ['laporan_warga', 'indikator_temuan', 'penjelasan_llm', 'pembayaran', 'progres', 'rab_item', 'tender', 'dokumen', 'prosedur_checklist']) {
    await pool.query(`DELETE FROM ${table} WHERE proyek_id IN (SELECT id FROM proyek WHERE is_dummy = true)`);
  }
  await pool.query('DELETE FROM perusahaan WHERE is_dummy = true AND NOT EXISTS (SELECT 1 FROM peserta_tender pt WHERE pt.perusahaan_id = perusahaan.id)');
  await pool.query('DELETE FROM proyek WHERE is_dummy = true');
}

async function run(): Promise<void> {
  await clearDummySeed();

  await clearPreviousRealSeed();
  await pool.query('DELETE FROM peserta_tender WHERE is_dummy = true');
  await pool.query('DELETE FROM perusahaan WHERE is_dummy = true AND NOT EXISTS (SELECT 1 FROM peserta_tender pt WHERE pt.perusahaan_id = perusahaan.id)');
  await pool.query('DELETE FROM harga_acuan WHERE is_dummy = true');
  await pool.query('DELETE FROM anggaran_dinas WHERE is_dummy = true');
  clearSeededMediaFiles();
  const seededMediaUrls = MEDIA_ASSETS.map((asset) => writeSeedMediaFile(asset));
  const companyCache = new Map<string, string>();

  for (const w of REGIONS) {
    await pool.query(
      `INSERT INTO wilayah (kode_bps, nama, lat, lng) VALUES ($1,$2,$3,$4) ON CONFLICT (kode_bps) DO NOTHING`,
      [w.kode_bps, w.nama, w.lat, w.lng],
    );
  }
  for (const s of DATA_SOURCES) {
    await pool.query(
      `INSERT INTO sumber_data (source_id, nama, url, lisensi, atribusi, boleh_otomatis, last_fetched_at, row_count)
       VALUES ($1,$2,$3,$4,$5,$6,now(),0)
       ON CONFLICT (source_id) DO UPDATE SET
         nama = EXCLUDED.nama,
         url = EXCLUDED.url,
         lisensi = EXCLUDED.lisensi,
         atribusi = EXCLUDED.atribusi,
         boleh_otomatis = EXCLUDED.boleh_otomatis`,
      [s.source_id, s.nama, s.url, s.lisensi, s.atribusi, s.boleh_otomatis ?? false],
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

    const announcementDate = addDays(rupAnnouncementDate, scenario.hari_rup);
    const determinationDate = addDays(announcementDate, 7);
    const winningBid = Math.round(hps * scenario.menangFactor);
    const tenderRes = await pool.query<{ id: string }>(
      `INSERT INTO tender (proyek_id, jumlah_peserta, jumlah_penawar, harga_penawaran_menang, tgl_pengumuman, tgl_penetapan, source_id, is_dummy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false)
       RETURNING id`,
      [
        uuid(p.n), scenario.jumlah_penawar, scenario.jumlah_penawar,
        winningBid, announcementDate, determinationDate, 'SRC-SEED',
      ],
    );
    const tenderId = tenderRes.rows[0].id;
    if (p.penyedia) {
      const winnerCompanyId = await upsertDummyCompany(companyCache, p.penyedia, p.source_url);
      await pool.query(
        `INSERT INTO peserta_tender (tender_id, perusahaan_id, harga_penawaran, menang, source_id, source_url, fetched_at, is_dummy)
         VALUES ($1, $2, $3, true, 'SRC-02', $4, now(), true)
         ON CONFLICT (tender_id, perusahaan_id) DO NOTHING`,
        [tenderId, winnerCompanyId, winningBid, p.source_url],
      );
      const runnerUps = RUNNER_UP_COMPANIES
        .filter((name) => name.toLowerCase() !== p.penyedia!.trim().toLowerCase())
        .slice(0, Math.max(0, scenario.jumlah_penawar - 1));
      for (let idx = 0; idx < runnerUps.length; idx += 1) {
        const runnerCompanyId = await upsertDummyCompany(companyCache, runnerUps[idx], p.source_url);
        const runnerBid = Math.round(winningBid * (1 + 0.02 * (idx + 1)));
        await pool.query(
          `INSERT INTO peserta_tender (tender_id, perusahaan_id, harga_penawaran, menang, source_id, source_url, fetched_at, is_dummy)
           VALUES ($1, $2, $3, false, 'SRC-02', $4, now(), true)
           ON CONFLICT (tender_id, perusahaan_id) DO NOTHING`,
          [tenderId, runnerCompanyId, runnerBid, p.source_url],
        );
      }
    }

    const paymentSchedule = buildPaymentSchedule(scenario.cair, p.status, p.tahun);
    for (const term of paymentSchedule) {
      await pool.query(
        `INSERT INTO pembayaran (proyek_id, termin_ke, tanggal, jumlah, persen_kontrak, source_id, is_dummy)
         VALUES ($1,$2,$3,$4,$5,$6,false)`,
        [uuid(p.n), term.termin_ke, term.tanggal, Math.round(contractValue * (term.persen / 100)), term.persen, 'SRC-SEED'],
      );
    }

    const progressSchedule = buildProgressSchedule(scenario.fisik, p.status, p.tahun);
    for (const prog of progressSchedule) {
      await pool.query(
        `INSERT INTO progres (proyek_id, tanggal, persen_fisik, sumber, source_id, is_dummy)
         VALUES ($1,$2,$3,$4,$5,false)`,
        [uuid(p.n), prog.tanggal, prog.persen, 'verifikasi lapangan', 'SRC-SEED'],
      );
    }

    for (let i = 0; i < scenario.laporan; i += 1) {
      const fotoUrls = seededMediaUrls;
      const totalVolumeRab = rabSchedule.reduce((sum, item) => sum + item.volume, 0);
      const shortfallPct = risk === 'tinggi' ? 0.20 : risk === 'perlu_perhatian' ? 0.10 : 0.05;
      const ukuranLapangan = Math.round(totalVolumeRab * (1 - shortfallPct));

      let seedStatus = 'Diverifikasi';
      let lembagaTujuan: string | null = null;
      let alasanTolak: string | null = null;
      let diteruskanPada: Date | null = null;

      if (i === 1) {
        if (p.n % 3 === 1) seedStatus = 'Dilaporkan';
        else if (p.n % 3 === 2) seedStatus = 'Selesai';
      } else if (i === 2) {
        if (p.n % 4 === 1 || p.n % 4 === 2) {
          seedStatus = 'Diteruskan';
          lembagaTujuan = 'Inspektorat Provinsi Lampung';
          diteruskanPada = new Date();
        } else if (p.n % 4 === 3) {
          seedStatus = 'Selesai';
        } else {
          seedStatus = 'Ditolak';
          alasanTolak = 'Bukti fisik tidak memadai atau berada di luar batas lingkup paket pekerjaan.';
        }
      }

      await pool.query(
        `INSERT INTO laporan_warga (tiket, proyek_id, kategori, keterangan, status, lat, lng, foto_urls, catatan_verifikator, ukuran_lapangan, lembaga_tujuan, diteruskan_pada, alasan_tolak)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (tiket) DO NOTHING`,
        [
          `LPR-${p.n}-${String(i + 1).padStart(3, '0')}`, uuid(p.n), 'Kualitas pekerjaan',
          `Laporan dummy ${i + 1} untuk proyek ${p.n}`, seedStatus, 0, 0,
          fotoUrls, 'Media simulasi untuk demo', ukuranLapangan, lembagaTujuan, diteruskanPada, alasanTolak,
        ],
      );
    }

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

    for (let i = 0; i < PROCEDURE_STEPS.length; i += 1) {
      const t = PROCEDURE_STEPS[i];
      await pool.query(
        `INSERT INTO prosedur_checklist (proyek_id, tahapan, terpenuhi, source_id, is_dummy)
         VALUES ($1,$2,$3,$4,false)`,
        [uuid(p.n), t.tahapan, isProcedureFulfilled(risk, i), 'SRC-SEED'],
      );
    }
  }

  await seedDepartmentBudgets();

  for (const p of PROJECTS) {
    await recalculateProjectScore(pool, uuid(p.n));
  }

  try {
    await connectRedis();
    if (redisClient.isReady) {
      await invalidateCache('projects', 'meta', 'stats', 'reports');
      console.log('Cache Redis diinvalidasi (projects, meta, stats, reports)');
    } else {
      console.warn('[seed] Redis tidak siap — cache tidak diinvalidasi. Jalankan FLUSHDB manual bila perlu.');
    }
  } finally {
    if (redisClient.isOpen) await redisClient.quit();
  }
}

run()
  .then(async () => { await pool.end(); process.exit(0); })
  .catch(async (err) => { console.error('Seed gagal:', err); await pool.end(); process.exit(1); });

export { PROJECTS, FINDINGS };
