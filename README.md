# Clearsight

Platform pemantauan proyek publik berbasis web yang membuka data proyek pemerintah daerah untuk warga: lihat progres di peta, telusuri profil proyek, kirim laporan warga, dan dapatkan penjelasan risiko berbahasa awam dari layanan LLM.

## Tech Stack

Frontend
- Vue 3 + Vite (Node.js 22+)
- Vue Router, Pinia
- Bootstrap 5
- Leaflet + `@vue-leaflet/vue-leaflet` (peta proyek)
- Axios

Backend
- Node.js 20 dengan TypeScript
- Express 5
- PostgreSQL 17 (via `pg`) + `node-pg-migrate`
- Redis 8
- Swagger UI Express
- Zod (validasi input), `bcrypt` + `jsonwebtoken` (autentikasi panel admin)
- `multer` (upload media & impor file), `nodemailer` (notifikasi surel HTML), `express-rate-limit`

LLM Service
- Node.js 20 + TypeScript + Express 5
- Zod untuk validasi payload (mendukung provider `mock`, `openai`, atau `gemini`)

Infrastruktur
- Docker + Docker Compose (`nginx`, `frontend`, `backend`, `backend-init`, `llm`, `db`, `redis`)
- Nginx `1.27-alpine` reverse proxy (`nginx/dev.conf` untuk development; opsi `nginx/nginx.conf` + Certbot untuk production)

## Cara Menjalankan Project

Prasyarat: Git, Docker + Docker Compose.

### Mode Development (Default)

1. Clone repository
   ```sh
   git clone <url-repo>
   cd <nama-folder>
   ```

2. Siapkan environment file
   ```sh
   cp backend/.env.example backend/.env
   cp llm-service/.env.example llm-service/.env
   # sesuaikan nilai bila perlu (mis. ADMIN_EMAIL, ADMIN_PASSWORD, SMTP_*, AI_PROVIDER)
   ```

3. Jalankan seluruh stack
   ```sh
   docker compose up -d --build
   ```
   Semua trafik HTTP masuk lewat Nginx di port 80 (`frontend`, `backend`, dan `llm` tidak di-expose langsung ke host):
   - Aplikasi (frontend): http://localhost
   - Panel Admin: http://localhost/admin/login
   - Backend API: http://localhost/api (mis. http://localhost/api/ping)
   - Swagger (dev): http://localhost/docs (spec JSON: http://localhost/docs.json)
   - Postgres: localhost:5433
   - Redis: localhost:6379

   LLM Service berjalan internal (diakses backend via `http://llm:3001`), tidak di-expose ke host.

   Migrasi database dan seed data awal berjalan otomatis via service `backend-init` (`npm run migrate up && npm run seed`) sebelum `backend` sehat.

   `compose.yml` dikonfigurasi untuk **mode development**: `NODE_ENV=development`, Nginx memakai `nginx/dev.conf`, CORS terbuka untuk `http://localhost` dan `http://localhost:5173`, Postgres/Redis memakai konfigurasi lokal, serta Swagger aktif di `/docs`. Baris untuk produksi tersedia dalam bentuk komentar bertanda `# PROD` pada `compose.yml` — jangan dipakai di lokal.

4. Siapkan akun admin panel pengawas
   ```sh
   # atur ADMIN_EMAIL, ADMIN_PASSWORD, dan ADMIN_NAMA di backend/.env lebih dulu
   docker compose exec backend npm run seed:admin
   ```
   Akun dibuat dari variabel lingkungan, bukan kredensial yang ditulis di kode. Login dapat dilakukan lewat UI panel admin di http://localhost/admin/login atau lewat `POST /api/auth/login` untuk memperoleh token Bearer.

### Pengujian & Build Lokal

- **Backend**:
  ```sh
  cd backend
  npm test
  npm run build
  ```
- **LLM Service**:
  ```sh
  cd llm-service
  npm test
  npm run build
  ```
- **Frontend**:
  ```sh
  cd frontend
  npm run lint
  npm run build
  ```

### Mode Production (Opsional / VPS)

Konfigurasi production menggunakan domain, HTTPS Certbot, Redis `--requirepass`, serta kredensial Postgres wajib melalui berkas `.env.production`:

1. Salin `.env.production.example` menjadi `.env.production` lalu isi kata sandi Postgres/Redis dan URL domain, serta lengkapi `JWT_SECRET`, `ENCRYPTION_KEY`, dan `SMTP_*` di `backend/.env`.
2. Pada `compose.yml`, aktifkan baris dan blok bertanda `# PROD` serta komentari baris bertanda `# DEV` (lalu sesuaikan domain dan jalur sertifikat di `nginx/nginx.conf` bila perlu).
3. Jalankan stack produksi:
   ```sh
   docker compose --env-file .env.production up -d --build
   ```

## Panduan Impor Data ETL (CSV & JSON)

Data proyek, anggaran dinas, dan peserta tender dapat diunggah dalam format CSV atau JSON lewat menu **Manajemen Data & Pipa ETL** (`/admin/data`). Sistem mendeteksi tujuan data secara otomatis berdasarkan sumber yang dipilih dan susunan kolom pada berkas.

### Cara Upload via Panel Admin

1. Masuk ke `/admin/login`, lalu buka menu **Manajemen Data & Pipa ETL** (`/admin/data`) pada tab **Sumber Data Publik**.
2. Klik **Jalankan ⟳** pada baris sumber yang sesuai:
   - **SiRUP LKPP (`sirup.inaproc.id`)** → untuk mengunggah daftar **Paket Pengadaan**.
   - **Data APBD (`DJPK Kemenkeu, SIPD Kemendagri, BPKAD daerah`)** → untuk mengunggah **Anggaran Dinas**.
   - **LPSE Provinsi Lampung dan kabupaten/kota (SPSE)** → untuk mengunggah **Peserta & Pemenang Tender**.
3. Pada modal **Pipa Data & ETL Publik**, pastikan tab **Unggah Berkas Resmi (CSV/JSON)** aktif.
4. Pilih berkas `.csv` atau `.json`, lalu klik **Unggah & Proses Berkas**.
5. Jika ada baris yang ditolak validasi, periksa alasannya di tab **Anomali Validasi**.

### Aturan Umum Format & Validasi

- **CSV:** pemisah koma `,`, encoding UTF-8; teks yang mengandung koma wajib diapit tanda kutip ganda `"..."`.
- **JSON:** wajib berupa array objek langsung di root (`[{ ... }]`), bukan objek pembungkus `{ "data": [...] }`.
- **Batas berkas:** maksimal `10 MB` (`.csv` atau `.json`).
- **Nominal uang** (`pagu`, `hps`, `realisasi`, `harga_penawaran`): bilangan bulat non-negatif tanpa pemisah ribuan maupun `Rp`.
- **Tanggal & tahun:** tanggal `YYYY-MM-DD`, tahun anggaran `2000`–`2100`.
- **Wilayah (`kode_bps`):** wajib menggunakan kode BPS Kabupaten/Kota Provinsi Lampung yang terdaftar:
  - `1801` Lampung Selatan, `1802` Lampung Tengah, `1803` Lampung Utara, `1804` Lampung Barat, `1805` Tulang Bawang, `1806` Tanggamus, `1807` Lampung Timur, `1808` Way Kanan, `1809` Pesawaran, `1810` Mesuji, `1811` Tulang Bawang Barat, `1812` Pesisir Barat, `1813` Pringsewu, `1871` Kota Bandar Lampung, `1872` Kota Metro.
- **Privasi:** `npwp` otomatis di-hash SHA-256 ke `npwp_hash`, dan data pribadi (`nik`, `alamat`, `telepon`, `no_hp`, `hp`, `email`, `npwp`, `kontak`) disaring otomatis sebelum pencatatan log kesalahan.

### Format & Contoh Berkas (Urutan Impor 1 → 2 → 3)

#### 1. Paket Pengadaan (SiRUP LKPP → `proyek`)

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

#### 2. Anggaran Dinas (Data APBD → `anggaran_dinas`)

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

#### 3. Peserta & Pemenang Tender (LPSE / SPSE → `perusahaan`, `tender`, `peserta_tender`)

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

### Jalur Data Pelengkap & Batasan Saat Ini

- **Form Admin (`/admin/proyek`):** melengkapi nilai kontrak, status proyek, detail tender (`jumlah_penawar`, `tgl_pengumuman`, `tgl_penetapan`), item RAB, pembayaran per termin, dan progres fisik (otomatis menghitung ulang skor proyek).
- **Portal Warga (`/lapor` & `/admin/laporan`):** menerima dan memverifikasi laporan warga beserta ukuran lapangan dan bukti foto/video.
- **Belum memiliki form impor/input di panel admin:** data standar harga acuan, daftar dokumen publik, checklist prosedur, serta koordinat peta (`lat`/`lng`).

## Progress Saat Ini

Frontend
- [x] Dashboard ringkasan pemantauan dengan peta proyek (Leaflet) dan filter wilayah/kategori
- [x] Halaman detail proyek (`/proyek/:id`) beserta profil anggaran, RAB/pembayaran/progres, penjelasan AI, label `asal_data`, dan laporan warga
- [x] Form pelaporan warga (`/lapor`) termasuk ukuran lapangan dan upload foto/video
- [x] Halaman pelacakan laporan (`/lacak-laporan`)
- [x] Panel Admin (`/admin/login` dan `/admin`): ringkasan operasional, antrean & detail verifikasi laporan warga (termasuk rekap cetak HTML), daftar & CRUD proyek/tender/RAB/pembayaran/progres fisik + riwayat nilai, manajemen data & ETL + pencocokan paket, pemantauan AI & guardrails, log audit, serta log & retensi notifikasi surel
- [x] Routing SPA dengan guard berbasis peran dan layout aplikasi

Backend
- [x] API proyek publik: list (paginasi, pencarian lintas field, filter server-side, KPI), detail, indikator, pembayaran, progres, RAB item, dokumen, checklist prosedur
- [x] API admin proyek & eksekusi: CRUD proyek, tender, item RAB, pembayaran termin, dan progres fisik dengan pengaman anti-manipulasi skor serta log `riwayat_nilai` append-only
- [x] Mesin skor deterministik dari `backend/config/scoring.json` (seluruh **12 dari 12** indikator `D1-01` s.d. `D6-02` aktif, termasuk `D1-01` kenaikan pagu `anggaran_dinas`, `D2-04` konsentrasi pemenang tender `peserta_tender`/`perusahaan`, dan `D3-01` selisih volume lapangan terhadap RAB)
- [x] API laporan warga: pembuatan, pelacakan per tiket, upload gambar/video + pembersihan metadata EXIF/GPS, serta enkripsi kontak pelapor AES-256-GCM
- [x] API panel admin laporan: antrean, detail internal, verifikasi, siklus 6 status, tren, penerusan ke lembaga pengawas, serta rekap cetak verifikasi
- [x] Modul ETL & pencocokan paket: konektor SiRUP, impor manual CSV/JSON (`POST /api/admin/etl/import` untuk proyek SiRUP, `anggaran_dinas` SRC-04, serta `perusahaan` tanpa PII / `peserta_tender` SRC-02 dengan rekalkulasi skor otomatis), eksekusi dengan advisory lock PostgreSQL, saklar `boleh_otomatis`, log `etl_error`, dan pencocokan paket antarsumber (`match_status`)
- [x] Integrasi layanan LLM untuk penjelasan risiko (`LLM-T1`: `POST /api/projects/:id/explain`) dan draf narasi tindak lanjut (`LLM-T2`: `POST /api/projects/:id/draft`)
- [x] Notifikasi surel HTML responsif (`multipart/alternative` via Nodemailer), log notifikasi, retry manual, dan retensi kontak pelapor
- [x] Autentikasi JWT + otorisasi peran (`admin`, `verifikator`, `peninjau`), log audit append-only, validasi Zod, cache Redis (GET dan LLM + invalidasi saat mutasi), serta rate limit API & LLM
- [x] Migrasi skema (`node-pg-migrate`), seeder data & akun admin, dokumentasi Swagger OpenAPI (45 operasi pada 40 path), serta unit test otomatis (`backend/tests`)

LLM Service
- [x] Endpoint penjelasan risiko (`explain`) dan draf tindak lanjut (`draft`) berbahasa awam
- [x] Validasi payload dengan Zod serta guardrail frasa terlarang
- [x] Dukungan provider `mock`, `openai`, `gemini`, konfigurasi env Docker Compose, dan unit test otomatis (`llm-service/tests`)

Optimasi
- [x] Pemuatan penjelasan AI non-blocking di dashboard serta caching hasil LLM & respons GET di Redis

Yang Belum
- [ ] Penyambungan ke API data pemerintah secara live di luar mode simulasi (`is_dummy = true` serta verifikasi ToS DR-10 pada masing-masing portal sumber data)
- [ ] Umpan balik otomatis ke pelapor (`LLM-T3`, saat ini ditunda di luar lingkup rilis aktif)

## Catatan Data

Aplikasi ini **masih berjalan dalam mode simulasi**. Data proyek berasal dari pemberitaan publik, sedangkan data pelengkap yang tidak terbuka untuk publik (pembayaran per termin, progres fisik lapangan, RAB rinci) dibuat tim dan ditandai permanen `is_dummy = true`. Label itu dipertahankan apa adanya sampai tersedia akses data resmi.

Skor risiko **bukan** keluaran AI: perhitungannya memakai mesin aturan deterministik dari `backend/config/scoring.json`, sehingga hasilnya dapat diaudit dan dihitung ulang. LLM hanya menjelaskan skor yang sudah final dalam bahasa awam, tidak pernah menghitung atau mengubahnya. Bobot dan ambang hanya dapat diubah lewat berkas konfigurasi yang terlacak git, bukan lewat API.

Seluruh angka yang ditampilkan adalah indikator risiko untuk diperiksa, bukan bukti pelanggaran.

## Lisensi

Proyek ini dirilis di bawah [MIT License](LICENSE) — Copyright (c) 2026 Akbar Vabiansyah, Ferdi Kurniawan, M Rizky Arya Seto.
