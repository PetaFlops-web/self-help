[← Kembali ke README](README.md)

# Panduan Impor Data ETL (CSV & JSON)

Data proyek, anggaran dinas, dan peserta tender dapat diunggah dalam format CSV atau JSON lewat menu **Manajemen Data & Pipa ETL** (`/admin/data`). Sistem mendeteksi tujuan data secara otomatis berdasarkan sumber yang dipilih dan susunan kolom pada berkas.

## Cara Upload via Panel Admin

1. Masuk ke `/admin/login`, lalu buka menu **Manajemen Data & Pipa ETL** (`/admin/data`) pada tab **Sumber Data Publik**.
2. Klik **Jalankan ⟳** pada baris sumber yang sesuai:
   - **SiRUP LKPP (`sirup.inaproc.id`)** → untuk mengunggah daftar **Paket Pengadaan**.
   - **Data APBD (`DJPK Kemenkeu, SIPD Kemendagri, BPKAD daerah`)** → untuk mengunggah **Anggaran Dinas**.
   - **LPSE Provinsi Lampung dan kabupaten/kota (SPSE)** → untuk mengunggah **Peserta & Pemenang Tender**.
3. Pada modal **Pipa Data & ETL Publik**, pastikan tab **Unggah Berkas Resmi (CSV/JSON)** aktif.
4. Pilih berkas `.csv` atau `.json`, lalu klik **Unggah & Proses Berkas**.
5. Jika ada baris yang ditolak validasi, periksa alasannya di tab **Anomali Validasi**.

## Aturan Umum Format & Validasi

- **CSV:** pemisah koma `,`, encoding UTF-8; teks yang mengandung koma wajib diapit tanda kutip ganda `"..."`.
- **JSON:** wajib berupa array objek langsung di root (`[{ ... }]`), bukan objek pembungkus `{ "data": [...] }`.
- **Batas berkas:** maksimal `10 MB` (`.csv` atau `.json`).
- **Nominal uang** (`pagu`, `hps`, `realisasi`, `harga_penawaran`): bilangan bulat non-negatif tanpa pemisah ribuan maupun `Rp`.
- **Tanggal & tahun:** tanggal `YYYY-MM-DD`, tahun anggaran `2000`–`2100`.
- **Wilayah (`kode_bps`):** wajib menggunakan kode BPS Kabupaten/Kota Provinsi Lampung yang terdaftar:
  - `1801` Lampung Selatan, `1802` Lampung Tengah, `1803` Lampung Utara, `1804` Lampung Barat, `1805` Tulang Bawang, `1806` Tanggamus, `1807` Lampung Timur, `1808` Way Kanan, `1809` Pesawaran, `1810` Mesuji, `1811` Tulang Bawang Barat, `1812` Pesisir Barat, `1813` Pringsewu, `1871` Kota Bandar Lampung, `1872` Kota Metro.
- **Privasi:** `npwp` otomatis di-hash SHA-256 ke `npwp_hash`, dan data pribadi (`nik`, `alamat`, `telepon`, `no_hp`, `hp`, `email`, `npwp`, `kontak`) disaring otomatis sebelum pencatatan log kesalahan.

## Format & Contoh Berkas (Urutan Impor 1 → 2 → 3)

### 1. Paket Pengadaan (SiRUP LKPP → `proyek`)

Menyimpan paket proyek sebagai data resmi dan menjalankan pencocokan otomatis paket antarsumber.

- **Wajib:** `kode_rup`, `nama_paket` *(JSON juga mendukung `nama`)*, `kode_bps`, `tahun_anggaran`, `pagu`
- **Opsional:** `kode_tender`, `satker` *(pada CSV header **wajib** `satker`; pada JSON boleh `satker` atau `dinas`)*, `hps`, `sumber_dana`, `metode_pemilihan`, `tgl_pembuatan_rup` *(JSON juga mendukung `pengumuman_rup_tgl`)*

CSV:
```csv
kode_rup,kode_tender,nama_paket,satker,kode_bps,tahun_anggaran,pagu,hps,sumber_dana,metode_pemilihan,tgl_pembuatan_rup
RUP-2026-REAL-0001,TDR-2026-REAL-0001,Peningkatan Ruas Jalan Ryacudu Sukarame,Dinas BMBK Provinsi Lampung,1871,2026,4500000000,4350000000,APBD,Tender Terbuka,2026-02-10
RUP-2026-REAL-0002,TDR-2026-REAL-0002,"Rehabilitasi Jaringan Irigasi Way Curup, Kalianda",Dinas PSDA Provinsi Lampung,1801,2026,3200000000,3100000000,APBD,Tender Terbuka,2026-02-18
```

JSON:
```json
[
  {
    "kode_rup": "RUP-2026-REAL-0001",
    "kode_tender": "TDR-2026-REAL-0001",
    "nama_paket": "Peningkatan Ruas Jalan Ryacudu Sukarame",
    "satker": "Dinas BMBK Provinsi Lampung",
    "kode_bps": "1871",
    "tahun_anggaran": 2026,
    "pagu": 4500000000,
    "hps": 4350000000,
    "sumber_dana": "APBD",
    "metode_pemilihan": "Tender Terbuka",
    "tgl_pembuatan_rup": "2026-02-10"
  },
  {
    "kode_rup": "RUP-2026-REAL-0002",
    "kode_tender": "TDR-2026-REAL-0002",
    "nama_paket": "Rehabilitasi Jaringan Irigasi Way Curup, Kalianda",
    "satker": "Dinas PSDA Provinsi Lampung",
    "kode_bps": "1801",
    "tahun_anggaran": 2026,
    "pagu": 3200000000,
    "hps": 3100000000,
    "sumber_dana": "APBD",
    "metode_pemilihan": "Tender Terbuka",
    "tgl_pembuatan_rup": "2026-02-18"
  }
]
```

### 2. Anggaran Dinas (Data APBD → `anggaran_dinas`)

Diproses bila diunggah lewat sumber **Data APBD** dan berkas **tidak** memuat `kode_rup` maupun `nama_paket`. Skor risiko paket terkait pada dinas dan wilayah tersebut akan dihitung ulang otomatis.

- **Wajib:** `dinas` *(alias: `satker`)*, `kode_bps`, `tahun` *(alias: `tahun_anggaran`)*, `pagu`
- **Opsional:** `realisasi`

CSV:
```csv
dinas,kode_bps,tahun,pagu,realisasi
Dinas BMBK Provinsi Lampung,1871,2025,18000000000,16500000000
Dinas BMBK Provinsi Lampung,1871,2026,22000000000,12400000000
Dinas PSDA Provinsi Lampung,1801,2026,14000000000,9800000000
```

JSON:
```json
[
  {
    "dinas": "Dinas BMBK Provinsi Lampung",
    "kode_bps": "1871",
    "tahun": 2025,
    "pagu": 18000000000,
    "realisasi": 16500000000
  },
  {
    "dinas": "Dinas BMBK Provinsi Lampung",
    "kode_bps": "1871",
    "tahun": 2026,
    "pagu": 22000000000,
    "realisasi": 12400000000
  },
  {
    "dinas": "Dinas PSDA Provinsi Lampung",
    "kode_bps": "1801",
    "tahun": 2026,
    "pagu": 14000000000,
    "realisasi": 9800000000
  }
]
```

### 3. Peserta & Pemenang Tender (LPSE / SPSE → `perusahaan`, `tender`, `peserta_tender`)

Diproses bila diunggah lewat sumber **LPSE Provinsi Lampung dan kabupaten/kota (SPSE)**, berkas **tidak** memuat `nama_paket`, dan proyek dengan `kode_tender` atau `kode_rup` terkait **sudah ada** di daftar proyek. Skor risiko proyek terkait akan dihitung ulang otomatis.

- **Wajib:** `kode_tender` atau `kode_rup`, `nama_badan_usaha` *(alias: `penyedia`, `perusahaan`)*
- **Opsional:** `npwp_hash` *(disarankan)* atau `npwp`, `harga_penawaran` *(alias: `harga_penawaran_menang`, `penawaran`)*, `menang` *(alias: `pemenang`, `is_winner`; nilai `true`/`1`/`ya`/`yes` atau `false`/`0`/`tidak`/`no`/kosong)*

CSV:
```csv
kode_tender,kode_rup,nama_badan_usaha,npwp_hash,harga_penawaran,menang
TDR-2026-REAL-0001,RUP-2026-REAL-0001,PT Siger Konstruksi Nusantara,8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4,4290000000,true
TDR-2026-REAL-0001,RUP-2026-REAL-0001,CV Krakatau Infrastruktur,,4345000000,false
TDR-2026-REAL-0002,RUP-2026-REAL-0002,PT Tirta Way Karya,,3050000000,true
```

JSON:
```json
[
  {
    "kode_tender": "TDR-2026-REAL-0001",
    "kode_rup": "RUP-2026-REAL-0001",
    "nama_badan_usaha": "PT Siger Konstruksi Nusantara",
    "npwp_hash": "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    "harga_penawaran": 4290000000,
    "menang": true
  },
  {
    "kode_tender": "TDR-2026-REAL-0001",
    "kode_rup": "RUP-2026-REAL-0001",
    "nama_badan_usaha": "CV Krakatau Infrastruktur",
    "harga_penawaran": 4345000000,
    "menang": false
  },
  {
    "kode_tender": "TDR-2026-REAL-0002",
    "kode_rup": "RUP-2026-REAL-0002",
    "nama_badan_usaha": "PT Tirta Way Karya",
    "harga_penawaran": 3050000000,
    "menang": true
  }
]
```

## Jalur Data Pelengkap & Batasan Saat Ini

- **Form Admin (`/admin/proyek`):** melengkapi nilai kontrak, status proyek, detail tender (`jumlah_penawar`, `tgl_pengumuman`, `tgl_penetapan`), item RAB, pembayaran per termin, dan progres fisik (otomatis menghitung ulang skor proyek).
- **Portal Warga (`/lapor` & `/admin/laporan`):** menerima dan memverifikasi laporan warga beserta ukuran lapangan dan bukti foto/video.
- **Belum memiliki form impor/input di panel admin:** data standar harga acuan, daftar dokumen publik, checklist prosedur, serta koordinat peta (`lat`/`lng`).

