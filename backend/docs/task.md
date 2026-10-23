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

- [ ] **12.1** Instalasi dependency dan fondasi middleware validasi.
  - Tambahkan `zod` ke `dependencies` di `package.json` dan jalankan `npm install`.
  - Buat `src/middlewares/validate.ts` berisi middleware generik `validateBody(schema)` dan `validateParams(schema)` yang mem-parse input dengan Zod, melempar `HttpError(400)` dengan pesan error terformat saat gagal, dan mengisi `req.body`/`req.params` dengan hasil parse.
  - **Verifikasi:** `npm run build` lolos; middleware dapat dipasang di route tanpa error.

- [ ] **12.2** Buat schema Zod di `src/utils/validators/`.
  - `src/utils/validators/reports.ts` — schema `CreateReportBodySchema` untuk `POST /api/reports` (proyek_id UUID, kategori wajib, keterangan 1–4000 karakter, lat/lng opsional number, foto_urls opsional array string, anonim opsional boolean).
  - `src/utils/validators/admin-reports.ts` — schema `VerifyReportBodySchema` untuk `PATCH /api/admin/reports/:id` (status enum Diverifikasi/Ditolak, alasan_tolak wajib jika status Ditolak).
  - `src/utils/validators/llm.ts` — schema `DraftBodySchema` untuk `POST /api/projects/:id/draft` (tujuan enum lembaga, default 'inspektorat').
  - **Verifikasi:** `npm run build` lolos; schema dapat di-import di route.

- [ ] **12.3** Pasang middleware validasi pada route POST/PATCH dan hapus validasi manual yang redundan.
  - Pasang `validateBody` di `src/routes/reports.ts`, `src/routes/admin-reports.ts`, dan `src/routes/llm.ts`.
  - Hapus atau kurangi validasi manual di `src/services/reports.ts`, `src/services/admin-reports.ts`, dan `src/controllers/llm.ts` yang sudah tercover Zod.
  - **Verifikasi:** `curl -X POST /api/reports -H 'Content-Type: application/json' -d '{"proyek_id":"not-uuid","kategori":""}'` mengembalikan HTTP 400 dengan pesan validasi; request valid tetap berhasil.

- [ ] **12.4** Verifikasi endpoint existing tetap berfungsi.
  - `POST /api/reports` dengan data valid membuat tiket.
  - `PATCH /api/admin/reports/:id` dengan data valid mengubah status laporan.
  - `POST /api/projects/:id/draft` dengan tujuan valid menghasilkan draf.
  - **Verifikasi:** `npm run build` lolos; curl ke endpoint mutasi valid mengembalikan 200/201 seperti sebelumnya.

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
