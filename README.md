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
