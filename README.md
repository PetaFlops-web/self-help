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
- Docker + Docker Compose (backend, llm, db Postgres, redis)

## Cara Menjalankan Project

Prasyarat: Git, Docker + Docker Compose, Node.js 22+ (hanya untuk mode dev frontend lokal).

1. Clone repository
   ```sh
   git clone <url-repo> clearsight
   cd clearsight
   ```

2. Siapkan environment file
   ```sh
   cp backend/.env.example backend/.env
   # sesuaikan nilai bila perlu
   ```

3. Jalankan backend stack (API, LLM service, Postgres, Redis)
   ```sh
   docker compose up -d --build
   ```
   Service yang terangkat:
   - Backend API: http://localhost:3000
   - LLM Service: http://localhost:3001
   - Postgres: localhost:5433
   - Redis: localhost:6379

4. Seed data awal (opsional, dari host)
   ```sh
   cd backend
   npm install
   npm run migrate up
   npm run seed
   ```

5. Jalankan frontend
   ```sh
   cd frontend
   npm install
   npm run dev
   ```
   Buka http://localhost:5173.

6. Build frontend untuk produksi
   ```sh
   npm run build
   npm run preview
   ```

## Progress Saat Ini

Frontend
- [x] Dashboard ringkasan pemantauan dengan peta proyek (Leaflet)
- [x] Halaman detail proyek beserta daftar laporan warga terkait
- [x] Form pelaporan warga (`/lapor`)
- [x] Halaman pelacakan laporan (`/lacak-laporan`)
- [x] Routing SPA dan layout aplikasi

Backend
- [x] API proyek: list, detail, daftar laporan per proyek
- [x] API laporan warga: pembuatan dan tracking status
- [x] Migrasi skema dan seeder data
- [x] Dokumentasi Swagger
- [x] Integrasi service LLM untuk penjelasan risiko

LLM Service
- [x] Endpoint penjelasan risiko proyek dalam bahasa awam
- [x] Validasi payload dengan Zod

Yang Belum
- [ ] Autentikasi dan dashboard admin
- [ ] Notifikasi real-time untuk update laporan
- [ ] Integrasi Redis untuk cache
- [ ] Upload gambar dan video untuk laporan warga
- [ ] Pengiriman laporan berdasarkan analisis LLM (sekadar copy and paste)