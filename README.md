# Clearsight

Platform pemantauan proyek publik berbasis web yang membuka data proyek pemerintah daerah untuk warga: lihat progres di peta, telusuri profil proyek, kirim laporan warga, dan dapatkan penjelasan risiko berbahasa awam dari layanan LLM.

## Tech Stack

Frontend
- Vue 3 + Vite
- Vue Router, Pinia
- Bootstrap 5
- Leaflet + @vue-leaflet/vue-leaflet (peta proyek)
- Axios

Backend
- Node.js 22+ dengan TypeScript
- Express 5
- PostgreSQL 17 (via `pg`) + `node-pg-migrate`
- Redis 8
- Swagger UI Express
- Zod (validasi input), bcrypt + JSON Web Token (autentikasi panel admin)

LLM Service
- Node.js + TypeScript + Express 5
- Zod untuk validasi payload

Infrastruktur
- Docker + Docker Compose (frontend, backend, llm, db Postgres, redis)

## Cara Menjalankan Project

Prasyarat: Git, Docker + Docker Compose.

1. Clone repository
   ```sh
   git clone <url-repo>
   cd <nama-folder>
   ```

2. Siapkan environment file
   ```sh
   cp backend/.env.example backend/.env
   cp llm-service/.env.example llm-service/.env
   # sesuaikan nilai bila perlu
   ```

3. Jalankan seluruh stack
   ```sh
   docker compose up -d --build
   ```
   Semua trafik HTTP masuk lewat Nginx di port 80 (frontend, backend, dan llm tidak di-expose langsung ke host):
   - Aplikasi (frontend): http://localhost
   - Backend API: http://localhost/api (mis. http://localhost/api/ping)
   - Swagger (dev): http://localhost/docs
   - Postgres: localhost:5433
   - Redis: localhost:6379

   LLM Service berjalan internal (diakses backend via `http://llm:3001`), tidak di-expose ke host.

   Migrasi database dan seed data awal berjalan otomatis via service `backend-init` sebelum backend start.

   `compose.yml` dikonfigurasi untuk **mode development**: `NODE_ENV=development`, Nginx memakai `nginx/dev.conf`, CORS terbuka untuk `localhost`, Postgres/Redis tanpa kata sandi tambahan, dan Swagger aktif. Baris untuk produksi tersedia dalam bentuk komentar bertanda `# PROD` pada file yang sama — jangan dipakai di lokal.

4. Siapkan akun admin panel pengawas (opsional, untuk mencoba endpoint admin)
   ```sh
   # atur ADMIN_EMAIL dan ADMIN_PASSWORD di backend/.env lebih dulu
   docker compose exec backend npm run seed:admin
   ```
   Akun dibuat dari variabel lingkungan, bukan kredensial yang ditulis di kode. Login lewat `POST /api/auth/login` untuk memperoleh token Bearer.

## Progress Saat Ini

Frontend
- [x] Dashboard ringkasan pemantauan dengan peta proyek (Leaflet)
- [x] Halaman detail proyek beserta daftar laporan warga terkait
- [x] Form pelaporan warga (`/lapor`)
- [x] Halaman pelacakan laporan (`/lacak-laporan`)
- [x] Upload gambar dan video untuk laporan warga
- [x] Routing SPA dan layout aplikasi

Backend
- [x] API proyek: list, detail, daftar laporan per proyek
- [x] API laporan warga: pembuatan dan tracking status
- [x] Migrasi skema dan seeder data
- [x] Dokumentasi Swagger (26 operasi, seluruh rute terpasang terdokumentasi)
- [x] Integrasi service LLM untuk penjelasan risiko
- [x] Upload gambar dan video untuk laporan warga, metadata EXIF/GPS dibersihkan
- [x] Cache Redis untuk response GET dan hasil LLM (invalidasi saat mutasi)
- [x] Rate limit endpoint LLM per IP (per menit dan per hari)
- [x] Validasi input mutasi dengan Zod
- [x] Autentikasi JWT + otorisasi peran (admin / verifikator / peninjau)
- [x] Log audit append-only untuk perubahan status dan aksi moderator
- [x] API panel admin: antrean laporan, detail internal, verifikasi, penerusan ke lembaga pengawas
- [x] Siklus enam status laporan dengan transisi yang ditegakkan

LLM Service
- [x] Endpoint penjelasan risiko proyek dalam bahasa awam
- [x] Validasi payload dengan Zod
- [x] Penggunaan .env docker compose secara secret untuk keamanan

Optimasi
- [x] Pemuatan penjelasan AI non-blocking di dashboard (first load lebih cepat)

Yang Belum
- [ ] Antarmuka dashboard admin di frontend (API-nya sudah tersedia, halamannya belum dibuat)
- [ ] Modul ETL dan penghubung API data pemerintah (SiRUP, SPSE, APBD)
- [ ] Pencocokan paket antarsumber (`match_status`)
- [ ] Tiga indikator yang belum terhitung karena tabel pendukung masih kosong: D1-01 (kenaikan pagu), D2-04 (konsentrasi pemenang), D3-01 (selisih volume lapangan)
- [ ] Umpan balik otomatis ke pelapor (LLM-T3)
- [ ] Notifikasi real-time untuk update laporan
- [ ] Pengiriman laporan berdasarkan analisis LLM (sekadar copy and paste)

## Catatan Data

Aplikasi ini **masih berjalan dalam mode simulasi**. Data proyek berasal dari pemberitaan publik, sedangkan data pelengkap yang tidak terbuka untuk publik (pembayaran per termin, progres fisik lapangan, RAB rinci) dibuat tim dan ditandai permanen `is_dummy = true`. Label itu dipertahankan apa adanya sampai tersedia akses data resmi.

Skor risiko **bukan** keluaran AI: perhitungannya memakai mesin aturan deterministik dari `backend/config/scoring.json`, sehingga hasilnya dapat diaudit dan dihitung ulang. LLM hanya menjelaskan skor yang sudah final dalam bahasa awam, tidak pernah menghitung atau mengubahnya. Bobot dan ambang hanya dapat diubah lewat berkas konfigurasi yang terlacak git, bukan lewat API.

Seluruh angka yang ditampilkan adalah indikator risiko untuk diperiksa, bukan bukti pelanggaran.

