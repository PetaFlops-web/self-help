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
   Service yang terangkat:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - LLM Service: http://localhost:3001
   - Postgres: localhost:5433
   - Redis: localhost:6379

   Migrasi database dan seed data awal berjalan otomatis via service `backend-init` sebelum backend start.

### Opsional: Dev mode frontend lokal

Butuh Node.js 22+.

```sh
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # build produksi
npm run preview
```

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
- [x] Dokumentasi Swagger
- [x] Integrasi service LLM untuk penjelasan risiko
- [x] Upload gambar dan video untuk laporan warga
- [x] Cache Redis untuk response GET dan hasil LLM (invalidasi saat mutasi)
- [x] Rate limit endpoint LLM per IP (per menit dan per hari)

LLM Service
- [x] Endpoint penjelasan risiko proyek dalam bahasa awam
- [x] Validasi payload dengan Zod
- [x] Penggunaan .env docker compose secara secret untuk keamanan

Optimasi
- [x] Pemuatan penjelasan AI non-blocking di dashboard (first load lebih cepat)

Yang Belum
- [ ] Autentikasi dan dashboard admin
- [ ] Fungsional dashboard admin (verifikasi laporan, rekap laporan)
- [ ] Penghubunga API data real-time pemerintah
- [ ] Notifikasi real-time untuk update laporan
- [ ] Pengiriman laporan berdasarkan analisis LLM (sekadar copy and paste)

