- Backend: TypeScript (ESM, NodeNext) + Express 5 + PostgreSQL (`pg` Pool) + Redis, migrasi via `node-pg-migrate`, build `tsc`, dev `tsx watch`.
- Infrastruktur lokal: Docker Compose `db_wialmb` (Postgres 17, port 5433) dan `redis_wialmb` (Redis 8, port 6379) — sudah berjalan.

Status awal yang terverifikasi:

- Backend hanya punya satu endpoint `GET /api/ping` (cek DB + Redis) dan file migrasi masih kosong (stub).

Konvensi tiap langkah: setiap langkah ditutup dengan **Verifikasi** — perintah atau pengecekan yang bisa dijalankan untuk memastikan langkah itu benar sebelum lanjut. Jangan lanjut ke langkah berikutnya sebelum langkah berjalan lolos verifikasi.

---

## Fase 0 — Fondasi & Konvensi Repo

- [x] **0.1** Pastikan `docker compose up -d` untuk `db` dan `redis` berjalan, lalu `GET /api/ping` mengembalikan `success: true` dengan `database_time` dan `redis_status` terisi.
  - **Verifikasi:** `curl http://localhost:<PORT>/api/ping` menampilkan JSON sukses (bukan 500).

- [x] **0.2** Struktur folder backend untuk fitur: `src/routes/`, `src/services/`, `src/controllers/` (atau cukup `routes` + `services`), plus `config/` untuk `scoring.json` dan `forbidden_phrases.json`.
  - **Verifikasi:** folder dibuat dan `tsc` masih lolos (`npm run build` tanpa error).

---

## Fase 1 — Skema Database (migrasi node-pg-migrate)

Setiap langkah = satu file migrasi baru dengan `up` dan `down`, lalu jalankan `npm run migrate up`. Skema mengacu SRS bagian 4.

- [x] **1.1** Migrasi tabel `wilayah` dan `sumber_data` (SRS 4.1). Termasuk kolom `source_id`, `source_url`, `fetched_at`, `is_dummy` sebagai kolom umum yang nanti diulang.
  - **Verifikasi:** `psql`/`docker exec db_wialmb psql -U root -d db_wia -c '\dt'` menampilkan kedua tabel.

- [x] **1.2** Migrasi tabel `proyek` (SRS 4.2): uuid PK, `kode_rup`, `kode_tender`, `nama`, `dinas`, `kode_bps` FK→`wilayah`, `tahun_anggaran`, `pagu`, `hps`, `nilai_kontrak`, `status`, `match_status`, `skor_total`, `kategori`, plus kolom umum.
  - **Verifikasi:** tabel `proyek` ada; FK ke `wilayah` valid (`\d proyek` menampilkan constraint).

- [x] **1.3** Migrasi tabel `tender`, `peserta_tender`, `perusahaan` (SRS 4.3). `perusahaan` hanya `nama_badan_usaha` + `npwp_hash` (DR-07, AC-16).
  - **Verifikasi:** tiga tabel ada; tidak ada kolom NIK/alamat pribadi di `perusahaan` dan `proyek`.

- [x] **1.4** Migrasi tabel `pembayaran`, `progres`, `rab_item`, `harga_acuan`, `anggaran_dinas` (SRS 4.4).
  - **Verifikasi:** lima tabel ada dengan kolom sesuai SRS.

- [x] **1.5** Migrasi tabel `laporan_warga`, `indikator_temuan`, `penjelasan_llm`, `etl_error` (SRS 4.5).
  - **Verifikasi:** empat tabel ada; `laporan_warga.tiket` text PK; `indikator_temuan` punya `kode_aturan`, `tingkat`, `bukti_ref`.

---

## Fase 2 — Konfigurasi & Mesin Skor (tanpa LLM)

- [x] **2.1** Buat `config/scoring.json` (SRS 5) dengan `category_thresholds`, `level_points`, `dimension_weights`, `rules[]`, `missing_data_policy`. Bobot awal D1 0,15 · D2 0,25 · D3 0,20 · D4 0,25 · D5 0,05 · D6 0,10.
  - **Verifikasi:** file JSON valid; `GET /api/config/scoring` (nanti) mengembalikannya (AC-14).

- [x] **2.2** Buat `config/forbidden_phrases.json` (SRS 6.7) dengan daftar frasa terlarang.
  - **Verifikasi:** file JSON valid.

- [x] **2.3** Mesin skor sebagai fungsi murni `src/services/scoring.ts` (FR-13, tanpa LLM): input data proyek → output `skor_total`, `kategori`, skor per dimensi, dan `indikator_temuan[]`. Dimensi "data belum cukup" dikeluarkan + bobot dinormalisasi (FR-10, FR-14).
  - **Verifikasi:** unit test (mis. `node --test` atau tsx) untuk 3 skenario PRD bagian 13: jalan (Tinggi), jembatan (Perlu Perhatian), drainase (Rendah) menghasilkan kategori sesuai.

- [x] **2.4** Simpan hasil skor ke kolom `skor_total`/`kategori` di `proyek` dan baris ke `indikator_temuan` saat proyek dibuat/diubah (cache).
  - **Verifikasi:** setelah seed, query menampilkan skor terisi.

---

## Fase 3 — API Read-Only Publik

Mengikuti pola `app.ts` (route dipasang di `app.use('/api', ...)`), import memakai ekstensi `.js` (ESM).

- [x] **3.1** `GET /api/regions` → GeoJSON/daftar `wilayah` (SRS 7.1).
  - **Verifikasi:** `curl` mengembalikan JSON 200.

- [x] **3.2** `GET /api/projects` → daftar proyek + filter (`kode_bps`, `dinas`, `kategori`, `tahun_anggaran`) + limit.
  - **Verifikasi:** `curl '/api/projects?kategori=Tinggi'` mengembalikan hanya proyek Tinggi.

- [x] **3.3** `GET /api/projects/{id}` → detail proyek lengkap.
  - **Verifikasi:** `curl` id valid → 200; id asal → 404.

- [x] **3.4** `GET /api/projects/{id}/indicators` → `indikator_temuan[]` proyek.
  - **Verifikasi:** `curl` mengembalikan daftar indikator dengan `kode_aturan` dan `sumber`.

- [x] **3.5** `GET /api/stats` → angka ringkas beranda (FR-05): jumlah proyek, sebaran kategori, rata-rata skor.
  - **Verifikasi:** `curl` mengembalikan JSON numerik konsisten dengan isi DB.

- [x] **3.6** `GET /api/sources` → daftar `sumber_data` + lisensi + `last_fetched_at` (FR-53).
  - **Verifikasi:** `curl` mengembalikan sumber dengan atribusi.

- [x] **3.7** `GET /api/config/scoring` → bobot/ambang aktif (SRS 7.1).
  - **Verifikasi:** `curl` output sama dengan `config/scoring.json`.

---

## Fase 4 — Seed Data Dummy

- [x] **4.1** Buat `seed/` berisi data dummy berlabel `is_dummy = true`, nama fiktif (PRD 13, DR-01, DR-02): 20–30 proyek di beberapa kabupaten, tiga skenario (Tinggi / Perlu Perhatian / Rendah).
  - **Verifikasi:** jalankan seed, `GET /api/projects` menampilkan 20–30 baris; skor tiap skenario sesuai.

---

## Fase 5A — Integrasi LLM & Fallback (Main Backend)

Main Backend bertugas menyiapkan data mentah, melemparnya ke LLM Service, dan menangani jika LLM Service gagal (fallback).

- [x] 5A.1 API Publik ke Internal: Buat endpoint POST /api/projects/{id}/explain dan /draft. Ambil detail proyek dan  indikator_temuan dari DB, lalu kirim HTTP POST request (via fetch atau axios) ke LLM Microservice (misal: http://localhost:3001/internal/generate). Pasang AbortController (timeout 10 detik) dan batas retry 1 kali.

Verifikasi: curl ke endpoint Main Backend berhasil meneruskan request ke LLM Microservice dan mengembalikan hasilnya. Jika LLM Service dimatikan paksa saat request berjalan, request terputus dalam batas 10 detik.

- [x] 5A.2 Sistem Penjelasan Cadangan (Fallback): Bungkus panggilan HTTP ke LLM Microservice dengan try...catch. Jika terjadi error (timeout, service mati, atau respon HTTP 4xx/5xx dari LLM Service), tangkap error-nya dan kembalikan JSON Penjelasan Cadangan (Template Statis) (SRS 6.9) dengan status HTTP 200.

Verifikasi: Matikan LLM Microservice, lalu jalankan curl -X POST .../explain ke Main Backend. Pastikan output-nya adalah JSON template cadangan (bukan HTTP 500 server error).

---

## Fase 6 — Lapor Warga & Panel Admin

- [x] **6.1** `POST /api/reports` → buat laporan warga (tiket, kategori, keterangan, lat/lng, foto, anonim) + `GET /api/reports?tiket=...` untuk lacak (FR-26).
  - **Verifikasi:** `curl` POST membuat tiket; GET mengembalikan status "Dilaporkan".

- [x] **6.2** `PATCH /api/admin/reports/{id}` → verifikasi laporan (status Diverifikasi/Ditolak + catatan), lalu picu hitung ulang skor proyek terkait (PRD 8).
  - **Verifikasi:** laporan terverifikasi mengubah skor D3 proyek setelah verifikasi.

- [x] **6.3** `GET /api/projects/{id}` → detail proyek sekarang menyertakan `laporan_warga` dengan `total` count dan daftar `items` (maksimal 20 item terbaru, semua status).
  - **Verifikasi:** `curl /api/projects/{id}` menampilkan field `laporan_warga.total` dan `laporan_warga.items[]` dengan field `tiket`, `kategori`, `status`, `dibuat_pada`.

- [x] **6.4** `GET /api/reports?tiket=...` → lacak laporan sekarang menampilkan `keterangan` (hanya jika status Diverifikasi/Ditolak) dan detail proyek (`nama`, `kabupaten`).
  - **Verifikasi:** `curl /api/reports?tiket=...` mengembalikan `report.keterangan`, `report.proyek.nama`, dan `report.proyek.kabupaten`.

- [x] **6.5** Upload media (foto/video) pada `POST /api/reports` via multer (PRD §208 Formulir foto, SRS SRC-09). `POST /api/reports` menerima `multipart/form-data` dengan field file `media` (maks 5 file) + field teks laporan. Middleware `src/middlewares/upload.ts`: validasi MIME `image/jpeg` dan `video/mp4`, batas 5 MB/file, disk storage `uploads/reports/` (nama acak), disajikan via `GET /uploads/...`. Error multer (ukuran/jumlah/tipe) diterjemahkan ke `HttpError` format response standar. `foto_urls[]` diisi otomatis dari URL file hasil upload.
  - **Verifikasi:** `npm run build` lolos; curl multipart — JPG valid → 201, MP4 valid → 201, PNG → 400 "Tipe file tidak didukung", file >5MB → 400 "Ukuran file melebihi batas maksimal 5 MB". File tersimpan di `uploads/reports/`, `foto_urls` ter-persist di DB, dan `GET /uploads/reports/<file>` → HTTP 200 `image/jpeg`.

---

## Fase 7 — ETL Data Publik (prioritas S, bisa menyusul)

- [ ] **7.1** Modul ETL minimal untuk satu sumber (mis. unduhan CSV/XLSX manual SRC-01/04) dengan `source_id`, `source_url`, `fetched_at`, validasi, dan `etl_error` (FR-48, FR-49, FR-50).
  - **Verifikasi:** jalankan ETL dua kali → tidak ada duplikasi (AC-12); baris invalid masuk `etl_error` (AC-11).

- [ ] **7.2** `POST /api/admin/etl/run` dan `GET /api/admin/etl/errors` (SRS 7.1).
  - **Verifikasi:** `curl` trigger + lihat error log.

---

## Fase penambahan dari owner

Endpoint dokumentasi API (Swagger) untuk dikonsumsi frontend.

- [x] **O.1** Buat endpoint dokumentasi API menggunakan Swagger UI (`swagger-ui-express`).
  - Tambah `src/config/swagger.ts` berisi spesifikasi OpenAPI 3.0.3 lengkap.
  - Tambah `src/routes/docs.ts` untuk serve Swagger UI di `GET /docs` dan raw spec di `GET /docs.json`.
  - Pasang router di `app.ts` dengan `app.use('/', docsRouter)`.
  - **Verifikasi:** `curl http://localhost:3000/docs` mengembalikan HTML Swagger UI; `curl http://localhost:3000/docs.json` mengembalikan JSON OpenAPI valid.

- [x] **O.2** Dokumentasikan seluruh endpoint API yang sudah ada agar siap dikonsumsi frontend.

  Endpoint publik (base path `/api`):
  - `GET /api/ping` — health check (DB + Redis).
  - `GET /api/regions` — daftar wilayah GeoJSON.
  - `GET /api/projects` — daftar proyek + filter (`kode_bps`, `dinas`, `kategori`, `tahun_anggaran`, `limit`).
  - `GET /api/projects/{id}` — detail proyek.
  - `GET /api/projects/{id}/indicators` — indikator temuan proyek.
  - `POST /api/projects/{id}/explain` — penjelasan proyek (LLM/fallback).
  - `POST /api/projects/{id}/draft` — draf laporan tindak lanjut (body: `tujuan`).
  - `GET /api/stats` — statistik ringkasan beranda.
  - `GET /api/sources` — daftar sumber data.
  - `GET /api/config/scoring` — konfigurasi scoring aktif.

  Endpoint dokumentasi:
  - `GET /docs` — antarmuka Swagger UI.
  - `GET /docs.json` — spesifikasi OpenAPI mentah (JSON).

  **Verifikasi:** `curl http://localhost:3000/docs.json` menampilkan skema request/response untuk semua endpoint di atas; frontend dapat memakai file ini sebagai acuan kontrak API.

- [x] **O.3** Perbaiki `seed/seed.ts` agar 13 proyek real memiliki data pendukung dummy (`harga_acuan`, `rab_item`, `tender`, `pembayaran`, `progres`, `laporan_warga`) sehingga mesin skor menghasilkan indikator dari dimensi D1, D2, D3, D4, dan D6, serta kategori proyek bervariasi (Tinggi / Perlu Perhatian / Rendah).
  - **Verifikasi:** setelah `npm run seed`, `GET /api/projects/{id}/indicators` mengembalikan 6–7 indikator; `/api/stats` menunjukkan minimal ada proyek Tinggi, Perlu Perhatian, dan Rendah.

- [x] **O.4** Tambahkan endpoint data keuangan dan progres proyek:
  - `GET /api/projects/{id}/payments` → daftar termin pembayaran + ringkasan total dibayar / persentase sisa.
  - `GET /api/projects/{id}/progress` → daftar riwayat progres fisik proyek.
  - Buat `src/types/financials.ts`, `src/repositories/financials.ts`, `src/services/financials.ts`, `src/controllers/financials.ts`, `src/routes/financials.ts`, dan daftarkan di `app.ts`.
  - Perbarui `src/config/swagger.ts` dengan spesifikasi kedua endpoint.
  - **Verifikasi:** `curl` ke `/api/projects/{id}/payments` dan `/api/projects/{id}/progress` mengembalikan JSON 200 dengan data sesuai skema Swagger; `npm run build` lolos.

- [x] **O.5** Tambahkan endpoint rincian RAB proyek untuk tabel "Bagian biaya yang dicek":
  - `GET /api/projects/{id}/rab-items` → daftar item RAB dengan join `harga_acuan`, termasuk perhitungan `total` (volume × harga_satuan) dan `deviasi_pct` (selisih harga_satuan vs harga_acuan).
  - Tambahkan tipe `RabItem` dan `RabItemsResponse` di `src/types/financials.ts`.
  - Tambahkan fungsi `getRabItemsByProyekId` di `src/repositories/financials.ts` dan `getProjectRabItems` di `src/services/financials.ts` serta `src/controllers/financials.ts`.
  - Daftarkan route `/projects/:id/rab-items` di `src/routes/financials.ts`.
  - Perbarui `src/config/swagger.ts` dengan skema `RabItem` dan `RabItemsResponse`.
  - **Verifikasi:** `curl /api/projects/{id}/rab-items` mengembalikan JSON 200 dengan array item RAB; `npm run build` lolos.

- [x] **O.6** Perbarui `seed/seed.ts` agar setiap proyek memiliki lebih dari satu baris progres (riwayat fisik), bukan hanya satu snapshot.
  - Setiap proyek selesai mendapat 3 snapshot: 40%, 70%, dan nilai final `fisik` dari skenario risiko.
  - Proyek dengan status `pelaksanaan` mendapat 2 snapshot.
  - **Verifikasi:** `curl /api/projects/{id}/progress` mengembalikan array `progres` dengan 2–3 item; `npm run build` dan `npm run seed` lolos.

---

## Fase 8 — Filter & Search Proyek (penambahan)

Berdasarkan PRD §11 (*Peta dan Daftar Proyek*: "filter kabupaten, dinas, **nilai**, risiko") dan kebutuhan menelusuri proyek, perlu menambahkan kemampuan pencarian/filter pada daftar proyek.

- [x] **8.1** Tambahkan pencarian teks (`q`) pada `GET /api/projects` untuk mencari `nama` proyek dan `dinas` menggunakan `ILIKE`.
  - **Verifikasi:** `curl '/api/projects?q=embung'` mengembalikan hanya proyek yang `nama` atau `dinas` mengandung "embung".

- [x] **8.2** Tambahkan filter range nilai (`pagu_min`, `pagu_max`, `nilai_kontrak_min`, `nilai_kontrak_max`) pada `GET /api/projects` untuk memenuhi filter nilai di PRD §11.
  - **Verifikasi:** `curl '/api/projects?nilai_kontrak_min=1000000000&nilai_kontrak_max=5000000000'` mengembalikan proyek dalam range tersebut.

- [x] **8.3** Perbarui dokumentasi Swagger (`src/config/swagger.ts`) untuk mencakup parameter baru (`q`, `pagu_min`, `pagu_max`, `nilai_kontrak_min`, `nilai_kontrak_max`) di spesifikasi `GET /api/projects`.
  - **Verifikasi:** `curl http://localhost:3000/docs.json` menampilkan parameter-parameter baru di `/projects`.

---

## Fase 11 — Seed RAB yang Lebih Realistis

Saat ini `seed/seed.ts` hanya membuat satu baris `rab_item` per proyek, sehingga endpoint `/api/projects/{id}/rab-items` hanya mengembalikan satu item dan indikator D1 kurang bermakna.

- [x] **11.1** Perbarui `seed/seed.ts` agar setiap proyek memiliki 3–5 item RAB dummy yang realistis (misalnya pekerjaan persiapan, pekerjaan utama, pekerjaan finishing).
  - Setiap item memiliki `uraian`, `satuan`, `volume`, dan `harga_satuan` sendiri.
  - Setiap item terhubung ke `harga_acuan` berbeda agar `deviasi_pct` bervariasi.
  - **Verifikasi:** `curl /api/projects/{id}/rab-items` mengembalikan array dengan 3–5 item; `npm run seed` dan `npm run build` lolos.

- [x] **11.2** Pastikan perubahan seed tetap menghasilkan kategori proyek yang bervariasi (Tinggi / Perlu Perhatian / Rendah) setelah `recalculateProjectScore`.
  - **Verifikasi:** setelah seed, `GET /api/stats` menunjukkan minimal ada proyek di setiap kategori.

---

## Fase 9 — Prosedur & Dokumen Keterbukaan

Berdasarkan PRD §9 (Spesifikasi Data: `Dokumen`, `Prosedur_Checklist`) dan SRS aturan D5/D6, dimensi kepatuhan prosedur dan keterbukaan informasi saat ini selalu berstatus *data belum cukup* karena tabel pendukung belum ada.

- [x] **9.1** Migrasi tabel `dokumen` dan `prosedur_checklist` sesuai PRD §9.
  - `dokumen`: `id`, `proyek_id`, `jenis`, `wajib`, `dipublikasikan`, `tanggal`.
  - `prosedur_checklist`: `proyek_id`, `tahapan`, `terpenuhi`.
  - **Verifikasi:** `\dt` menampilkan kedua tabel; kolom sesuai spesifikasi.

- [x] **9.2** Seed data dummy untuk `dokumen` dan `prosedur_checklist` agar D5 dan D6 bisa dihitung untuk proyek-proyek existing.
  - **Verifikasi:** setelah `npm run seed`, query `dokumen` dan `prosedur_checklist` memiliki baris untuk setiap proyek.

- [x] **9.3** Endpoint read-only publik:
  - `GET /api/projects/{id}/documents` → daftar dokumen wajib publik proyek.
  - `GET /api/projects/{id}/procedure-checklist` → daftar checklist prosedur proyek.
  - **Verifikasi:** `curl` mengembalikan JSON 200 dengan data sesuai; `npm run build` lolos.

- [x] **9.4** Perluas mesin skor (`src/services/project-scoring.ts`) agar membaca `dokumen` dan `prosedur_checklist`, lalu menghitung indikator D5 dan D6.
  - **Verifikasi:** setelah seed, `GET /api/projects/{id}/indicators` mengembalikan indikator dari D1–D6 (tidak ada dimensi yang *data belum cukup* karena dummy melengkapi semua); skor total dan kategori berubah sesuai.

- [x] **9.5** Perbarui dokumentasi Swagger dengan skema dan endpoint baru.
  - **Verifikasi:** `curl http://localhost:3000/docs.json` menampilkan `/projects/{id}/documents` dan `/projects/{id}/procedure-checklist`.

---

## Fase 10 — Cache & Rate Limit LLM

Berdasarkan SRS §6.1, LLM-07, LLM-08, dan NFR-11, endpoint LLM perlu cache hasil dan pembatasan laju untuk efisiensi kuota serta keamanan.

- [ ] **10.1** Simpan hasil LLM yang lolos validasi ke tabel `penjelasan_llm` dengan `input_hash`, `model`, `versi_prompt`, `jenis`, dan `isi_json`.
  - **Verifikasi:** setelah memanggil `/explain` atau `/draft`, baris baru muncul di `penjelasan_llm`.

- [ ] **10.2** Gunakan cache `penjelasan_llm` bila `input_hash` sama untuk jenis yang sama; hindari panggilan ulang ke LLM Microservice.
  - **Verifikasi:** panggilan kedua ke `/explain` untuk proyek yang sama mengembalikan hasil lebih cepat tanpa memanggil LLM service (log LLM service tidak menerima request baru).

- [ ] **10.3** Tambahkan rate limit per alamat IP per hari untuk endpoint `POST /api/projects/{id}/explain` dan `POST /api/projects/{id}/draft`.
  - **Verifikasi:** setelah melebihi batas, request mengembalikan HTTP 429 dengan pesan yang jelas.

- [ ] **10.4** Perbarui dokumentasi Swagger untuk mencakup respons 429 dan skema `PenjelasanLLM`.
  - **Verifikasi:** `curl http://localhost:3000/docs.json` menampilkan respons 429 di endpoint LLM.

---

## Fase 12 — Validasi Input dengan Zod

Berdasarkan kebutuhan menjaga konsistensi dan keamanan input pada endpoint mutasi, seluruh request **POST**, **PATCH/UPDATE**, dan **DELETE** wajib divalidasi menggunakan package `zod` sebelum masuk ke controller/service. Endpoint GET tetap menggunakan helper manual yang ada.

- [x] **12.1** Instalasi dependency dan fondasi middleware validasi.
  - `zod@^4.6.7` ditambahkan ke `dependencies`.
  - `src/middlewares/validate.ts` berisi `validateBody(schema)` dan `validateParams(schema)`: parse dengan Zod, gagal → `HttpError(400)` dengan pesan terformat `field: pesan`, sukses → `req.body`/`req.params` diisi hasil parse (sudah di-coerce).
  - **Verifikasi:** `npm run build` lolos; middleware terpasang di route tanpa error.

- [x] **12.2** Schema Zod di `src/utils/validators/`.
  - `reports.ts` — `CreateReportBodySchema`: proyek_id UUID wajib, kategori wajib non-kosong, keterangan 1–4000 karakter, lat/lng opsional number (coerce dari string multipart, rentang valid), anonim opsional boolean (coerce). `foto_urls` diisi dari upload multer, bukan dari body.
  - `admin-reports.ts` — `VerifyReportBodySchema`: status enum Diverifikasi/Ditolak wajib, alasan_tolak wajib jika status Ditolak (refine), catatan_verifikator opsional.
  - `llm.ts` — `DraftBodySchema`: tujuan enum lembaga, default 'inspektorat'.
  - `common.ts` — `IdParamSchema`: param `:id` UUID.
  - **Verifikasi:** `npm run build` lolos; schema di-import di route.

- [x] **12.3** Pasang middleware validasi pada route POST/PATCH dan rampingkan validasi redundan.
  - `validateBody` terpasang di `reports.ts`, `admin-reports.ts`, `llm.ts`; `validateParams(IdParamSchema)` di route `:id` LLM. `POST /api/reports` juga punya `requireReportMedia` (minimal 1 file wajib) sebelum validateBody.
  - Validasi manual di `controllers/llm.ts` dan `controllers/admin-reports.ts` dihapus; `controllers/reports.ts` kini baca body yang sudah ter-parse. Cek bisnis di service layer (eksistensi proyek, 404/409) dipertahankan sebagai defense-in-depth.
  - **Verifikasi:** `POST /api/reports` proyek_id non-UUID → 400 "proyek_id: proyek_id harus UUID yang valid"; request valid → 201.

- [x] **12.4** Verifikasi endpoint mutasi berfungsi (server lokal port 3002, DB db_wialmb port 5433).
  - POST /api/reports: valid → 201; proyek_id non-UUID → 400; keterangan kosong → 400; lat non-angka → 400; tanpa media → 400.
  - PATCH /api/admin/reports/:id: status invalid → 400; Ditolak tanpa alasan_tolak → 400; body kosong → 400.
  - POST /api/projects/:id/draft: id param non-UUID → 400; tujuan invalid → 400 (menampilkan daftar enum valid).
  - **Verifikasi:** `npm run build` lolos; 10 kasus curl sesuai ekspektasi (invalid → 400 dengan pesan, valid → 201).

---

## Fase 13 — Refactoring: Konsistensi Bahasa Inggris untuk Nama Function/Type

Ubah nama setiap `function`, `interface`, `type`, dan variabel lokal yang masih menggunakan bahasa Indonesia di `src/` dan `seed/` menjadi bahasa Inggris secara konsisten. Nama kolom database, nama tabel, endpoint URL, dan properti JSON response tetap tidak diubah agar tidak merusak kontrak API dan data existing.

- [x] **13.1** Identifikasi mapping rename seluruh simbol berbahasa Indonesia di `src/` dan `seed/`, kelompokkan per file.
  - **Verifikasi:** daftar mapping rename tertulis dan disetujui owner sebelum implementasi.

- [x] **13.2** Refactor tipe/interface (`src/types/`) dan repository (`src/repositories/`) ke bahasa Inggris.
  - Contoh: `Proyek` → `Project`, `LaporanWarga` → `CitizenReport`, `Wilayah` → `Region`, `IndikatorTemuan` → `IndicatorFindingRow`, `listProyek` → `listProjects`, `getProyekById` → `getProjectById`.
  - **Verifikasi:** `npm run build` lolos setelah batch ini.

- [x] **13.3** Refactor services dan controllers ke bahasa Inggris.
  - Pastikan semua import dan pemanggilan fungsi dari repository/types sudah mengikuti nama baru.
  - **Verifikasi:** `npm run build` lolos setelah batch ini.

- [x] **13.4** Refactor `seed/seed.ts` dan helper seed ke bahasa Inggris.
  - Contoh: `PROYEK` → `PROJECTS`, `WILAYAH` → `REGIONS`, `dokumenDipublikasikan` → `isDocumentPublished`.
  - **Verifikasi:** `npm run build` dan `npm run seed` lolos; data dummy tetap sama jumlah dan kategorinya.

- [x] **13.5** Smoke test endpoint existing untuk memastikan kontrak API tidak berubah.
  - `GET /api/projects`
  - `GET /api/projects/:id`
  - `GET /api/projects/:id/indicators`
  - `GET /api/projects/:id/documents`
  - `GET /api/projects/:id/procedure-checklist`
  - `POST /api/reports`
  - `PATCH /api/admin/reports/:id`
  - `POST /api/projects/:id/explain`
  - `POST /api/projects/:id/draft`
  - `GET /api/stats`
  - **Verifikasi:** semua endpoint mengembalikan status dan struktur respons yang sama seperti sebelum refaktor.

- [x] **13.6** Perbarui dokumentasi Swagger bila ada referensi nama tipe/schema yang berubah.
  - **Verifikasi:** `curl http://localhost:3000/docs.json` tetap valid dan spesifikasi endpoint tidak rusak.

---

## Fase 14 — Perbaikan Prompt LLM dan Integrasi RAB

Berdasarkan hasil uji coba penjelasan LLM, prompt perlu diperjelas agar keluaran lebih awam, terstruktur, dan tidak membuat RAB sebagai penentu risiko.

- [x] **14.1** Tambahkan contoh pola penjelasan ke system prompt `llm-service/src/services/prompt.ts` agar LLM menghasilkan ringkasan dan temuan seperti contoh hasil yang diinginkan (gaya bahasa awam, kalimat pendek, pola "apa yang terlihat + angka + batas perhatian + wajar ditanyakan").
  - **Verifikasi:** `npm run build` dan `npm test` di llm-service lolos.

- [x] **14.2** Pastikan prompt tidak menganggap RAB sebagai pengambil keputusan awal: RAB items hanya bahan penjelasan tambahan untuk temuan D1/D2/D4 yang sudah tercantum; skor final dari DATA; jangan menghitung ulang.
  - **Verifikasi:** prompt memuat aturan eksplisit di atas.

- [x] **14.3** Backend mengirimkan `rab_items` ke llm-service pada payload `/explain` dan `/draft`.
  - **Verifikasi:** payload backend ke `/internal/generate` memuat field `rab_items` dengan 3–5 item.

- [x] **14.4** Tangani keluaran LLM yang menghasilkan lebih dari 6 temuan dengan memotong array ke 6 elemen setelah filter kode aturan, agar tidak gagal validasi skema.
  - **Verifikasi:** uji validasi dengan 8 temuan berhasil dipotong menjadi 6; `npm test` lolos.

- [x] **14.5** Perbaiki peta dashboard agar pin proyek di sekitar membaca data backend yang sudah dipetakan (\`name\`, \`riskLevel\`, \`riskScore\`, \`location\`) dan tidak menampilkan \`undefined\`.
  - **Verifikasi:** `npm run build` frontend lolos; pin tooltip menampilkan nama, lokasi, dan label risiko proyek.

- [x] **14.6** Klik pin proyek di peta akan memindahkan analisis dashboard ke proyek yang dipilih (memuat ulang data dashboard untuk proyek tersebut dan menyorot peta ke koordinat proyek baru).
  - **Verifikasi:** klik pin proyek selain proyek utama memicu pembaruan seluruh dashboard; `npm run build` frontend lolos.

- [x] **14.7** Sambungkan tombol "Buat draf laporan" pada dashboard ke backend `/projects/:id/draft`, lalu arahkan pengguna ke halaman **Lapor Warga** (`/lapor`) dengan field `title`, `projectId`, `projectName`, `category`, dan `description` sudah terisi dari draf hasil AI.
  - **Verifikasi:** `npm run build` frontend lolos; klik tombol memicu pembuatan draf dan navigasi ke form laporan dengan isian awal.

- [x] **14.8** Ganti logo dan nama brand frontend dari **AliranTerang** menjadi **Clearsight**: gunakan `clearsight-mark-light.svg` sebagai logo, perbarui judul halaman, teks navbar, dan seluruh referensi brand di frontend.
  - **Verifikasi:** `npm run build` frontend lolos; tidak ada sisa teks "AliranTerang" di dalam folder `frontend`.

- [x] **14.9** Perbaiki warna badge status pada halaman **Lacak Laporan** agar sesuai makna: `Diverifikasi`/`Selesai` hijau, `Ditolak` merah, status lain kuning/oranye.
  - **Verifikasi:** `npm run build` frontend lolos; badge `ticket-status` sekarang memiliki class `is-verified`, `is-rejected`, atau `is-pending`.

- [x] **14.10** Tambahkan skeleton loading untuk bagian **Profil risiko** dan **Indikator yang terdeteksi** di dashboard, sehingga tidak menampilkan data kosong saat data masih dimuat.
  - **Verifikasi:** `npm run build` frontend lolos; `RiskSection.vue` menampilkan placeholder skeleton saat `showSkeleton` aktif.

- [x] **14.11** Setelah laporan warga berhasil dikirim, arahkan ke halaman **Lacak Laporan** (`/lacak-laporan?code=...`) dan tampilkan skeleton loading saat data laporan sedang dimuat.
  - **Verifikasi:** `npm run build` frontend lolos; `ReportTrackingView` otomatis melacak laporan dari query `code` dan menampilkan skeleton selama fetching.

---

## Fase 15 — Media Laporan Warga Publik (Backend + Frontend)

Menampilkan foto/video laporan warga secara transparan ke publik — di tooltip pin peta yang bisa diklik (2 aksi: lihat proyek / detail laporan warga), di modal "Lihat semua laporan", dan di halaman Lacak Laporan — dengan filter media Diverifikasi vs Belum Diverifikasi untuk perbandingan. Sekaligus menyelaraskan form laporan agar benar-benar mengunggah media (multipart, wajib ≥1 file, jpg/mp4, 5MB). Rujukan: PRD §171, §208, §244–246; SRS SRC-09; melanjutkan Fase 6.5 (upload) dan Fase 12 (validasi). Rencana lengkap: `.hermes/plans/2026-10-29_170400-media-laporan-warga-publik.md`.

Keputusan owner: (1) media dapat difilter Diverifikasi vs Belum Diverifikasi untuk perbandingan; (2) tooltip pin jadi popup yang bisa diklik dengan 2 pilihan (Lihat proyek, Detail laporan warga berisi jumlah laporan + galeri image/video); (3) galeri publik tampil di modal peta + halaman Lacak Laporan; (4) pendekatan terpadu backend + frontend.

### Backend — ekspos data media

- [x] **15.1** Tambahkan `foto_urls`, `keterangan`, `anonim` ke `ProjectReportItem` (`src/types/project.ts`) dan ambil kolom tersebut pada query `listReportsByProjectId` (`src/repositories/citizen-report.ts`).
  - **Verifikasi:** `npm run build` lolos; `curl /api/projects/<uuid>` menampilkan `laporan_warga.items[].foto_urls` (teruji: 10 item, foto_urls terisi).

- [x] **15.2** Tambahkan `foto_urls`, `anonim`, `lat`, `lng` ke `ReportPublicView` (`src/types/citizen-report.ts`) dan isi di `toPublicView` (`src/repositories/citizen-report.ts`).
  - **Verifikasi:** `npm run build` lolos; `curl "/api/reports?tiket=<tiket>"` menampilkan `report.foto_urls` (teruji: jpg + mp4).

- [x] **15.3** Endpoint publik daftar laporan per proyek dengan filter status: `GET /api/projects/:id/reports?status=` (`listProjectReports` controller, `getProjectReports` service, `listPublicReportsByProjectId` repo, route + `validateParams(IdParamSchema)`). Mendukung filter perbandingan dan "Lihat semua N laporan" tanpa batas 20 item.
  - **Verifikasi:** `npm run build` lolos; teruji — total=10, `?status=Dilaporkan`=7, `?status=Diverifikasi`=3, id non-UUID → 400.

### Frontend — konsumsi & tampilan

- [x] **15.4** Helper origin media di `src/config/api.js` (`API_ORIGIN`, `mediaUrl(path)`) dan util pembeda image/video di `src/utils/media.js` (`toMediaItem`, `toMediaItems`).
  - **Verifikasi:** `npm run build` lolos; teruji `API_ORIGIN` menghapus `/api` dari base URL.

- [x] **15.5** Komponen galeri media reusable `src/components/ui/MediaGallery.vue` (grid thumbnail gambar + `<video>` + lightbox dengan navigasi prev/next, tanpa dependensi baru, gambar `loading="lazy"`, video thumbnail `preload="metadata"`).
  - **Verifikasi:** `npm run build` lolos; ter-bundle sebagai chunk `MediaGallery`.

- [x] **15.6** Mapper `toProjectReportsPanel` (`src/services/api/mappers.js`) menyertakan `media` (dari `foto_urls`), `verified`, `anonim`, dan `description` per item laporan.
  - **Verifikasi:** `npm run build` lolos.

- [x] **15.7** `ReportsModal.vue` menampilkan galeri media per laporan + filter perbandingan status (Semua / Diverifikasi / Belum diverifikasi) dengan badge "Media belum diverifikasi" untuk yang belum.
  - **Verifikasi:** `npm run build` lolos; filter verified/unverified mengubah daftar; `<MediaGallery>` dirender per item.

- [x] **15.8** Tooltip pin pada `AppMap.vue` dilengkapi popup interaktif 2 aksi (`bindPopup` + `popupopen` delegasi klik) emit `marker-action`: "Lihat proyek" dan "Detail laporan warga (N)"; handler `onMarkerAction` di `MapSection.vue`. Tooltip hover dipertahankan untuk ringkasan; `reportCount` diisi dari `selected.total` pin proyek utama. CSS popup di `assets/styles/map.css`.
  - **Verifikasi:** `npm run build` lolos; aksi `project` memindah/sorot proyek, aksi `reports` membuka modal galeri.

- [x] **15.9** Form laporan (`CitizenReportView.vue` + `mappers.js` `toReportPayload` + `reports.api.js` `create`) kirim `FormData` multipart (header `multipart/form-data`); unggah wajib ≥1 file; batas diselaraskan 5MB + jpg/mp4 + maks 5 berkas (`accept`, `MAX_FILE_BYTES`, `MAX_FILES`, `ALLOWED_EXT`); catatan "unggah belum tersedia" dihapus; field `anonim` ikut dikirim.
  - **Verifikasi:** `npm run build` lolos; validasi submit menolak tanpa file; batas FE selaras backend (teruji di Fase 6.5: PNG/>5MB ditolak backend).

- [x] **15.10** `ReportTrackingView.vue` menampilkan media nyata dari `foto_urls` (gambar + video) via `MediaGallery`; `safeUrl`/blok `.photos` lama dihapus.
  - **Verifikasi:** `npm run build` lolos; media jpg → 200 image/jpeg, mp4 → 200 video/mp4 (static serving teruji).

- [x] **15.13** (WAJIB) Konfigurasi reverse proxy nginx untuk media laporan. Ditambahkan ke `nginx/dev.conf` dan `nginx/nginx.conf` (prod):
  - `location /uploads` → `proxy_pass http://backend:3000` agar media dapat diakses publik. Tanpa rute ini, request `/uploads/...` jatuh ke `location /` (SPA) dan mengembalikan `index.html` (HTTP 200 `text/html`), sehingga `<img>`/`<video>` rusak. (prod + cache 7 hari).
  - `client_max_body_size 30m` di level server (default nginx 1MB) agar upload media (maks 5 file × 5MB) tidak ditolak `413 Request Entity Too Large` sebelum mencapai backend.
  - **PITFALL:** `dev.conf`/`nginx.conf` di-bind-mount sebagai SATU file (`:ro`). Mengedit file di host mengganti inode-nya, tetapi container masih memegang inode lama — `nginx -s reload` TIDAK melihat perubahan. Wajib `docker restart nginx_proxy_self-help` agar file ter-mount ulang.
  - **Verifikasi:** setelah restart nginx, `curl http://localhost/uploads/reports/<file>` → `[200] image/jpeg` (bukan `text/html`); upload ~4MB via `POST http://localhost/api/reports` → `201` (bukan 413); gambar tampil di FE.

### Open question (perlu keputusan owner sebelum go-live publik)

- [ ] **15.11** Privasi EXIF/geotag: PRD §246 menjanjikan metadata foto dibersihkan, tetapi backend belum strip EXIF. Putuskan: tambah strip metadata (mis. `sharp`) sebelum tayang publik, atau tegaskan di UI bahwa metadata belum dibersihkan.
- [ ] **15.12** Moderasi media belum-diverifikasi: menayangkan media semua status berisiko konten mentah/tidak pantas tampil sebelum diperiksa. Putuskan: perlukah tombol admin sembunyikan/hapus media.

---

## Fase 16 — Fix Packaging LLM Service (config/forbidden_phrases.json)

- [x] **16.1** (WAJIB) `llm-service/Dockerfile` hanya meng-copy `dist/` ke image final, sehingga `config/forbidden_phrases.json` tidak ikut dan `loadForbiddenPhrases()` (dibaca dari `process.cwd()/config/`) melempar ENOENT. Error ini mengenai SEMUA provider (mock/openai/gemini) karena `checkForbiddenPhrases()` divalidasi di setiap keluaran LLM — bukan khusus mode mock. Perbaikan: tambah `COPY --from=builder /app/config ./config` di stage final.
  - **PITFALL:** `docker compose up -d` TIDAK me-recreate container bila image tag (`:latest`) sama walau image sudah di-rebuild. Wajib `docker rm -f ml_service_self-help` lalu `docker compose up -d --force-recreate llm`.
  - **Verifikasi:** `docker exec ml_service_self-help ls config/forbidden_phrases.json` ada; `POST /api/projects/{id}/explain` dan `/draft` (mode mock) → `200 success`, log llm bersih tanpa ENOENT/forbidden.

- [x] **16.2** Mode `openai` siap digunakan setelah fix 16.1. Env container sudah lengkap: `AI_API_KEY`, `AI_MODEL=deepseek-chat`, `AI_API_URL=https://api.deepseek.com/chat/completions`. Ganti `AI_PROVIDER=mock` → `openai` di `llm-service/.env` lalu recreate container. Syarat: endpoint mendukung `response_format: json_object`; perhatikan `AI_TIMEOUT_MS` (10s) dan `AI_MAX_TOKENS` (4096) untuk model reasoning. Fix config phrases 16.1 tetap prasyarat karena validasi berlaku untuk semua provider.
