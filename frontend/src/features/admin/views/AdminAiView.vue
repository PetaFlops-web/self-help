<template>
  <div class="admin-ai-page">
    <!-- Header -->
    <header class="ai-head">
      <div>
        <h2 class="ai-title">Pemantauan Model AI (LLM) &amp; Guardrails</h2>
        <p class="ai-desc">
          Monitoring inferensi LLM-T1, LLM-T2, LLM-T3, validasi skema JSON, dan filter frasa terlarang (SRS §6).
        </p>
      </div>
      <div class="ai-head-badge">
        <span class="ai-badge-dot" />
        <span>GUARDRAIL AKTIF</span>
      </div>
    </header>

    <!-- Top KPI row -->
    <div class="ai-kpi-grid">
      <div class="ai-kpi-card">
        <span class="ai-kpi-label">STATUS PROVIDER LLM</span>
        <div class="ai-kpi-val text-success">Aktif (Deterministic)</div>
        <span class="ai-kpi-hint">Suhu 0.2 · Minim Halusinasi (SRS §6.3)</span>
      </div>

      <div class="ai-kpi-card">
        <span class="ai-kpi-label">PENGECUALIAN FRASA RESMI</span>
        <div class="ai-kpi-val">KPK / BPK / ICW</div>
        <span class="ai-kpi-hint">Diizinkan khusus sebagai nama lembaga (SRS §6.7)</span>
      </div>

      <div class="ai-kpi-card">
        <span class="ai-kpi-label">MODE TOLERANSI GALAT</span>
        <div class="ai-kpi-val text-info">Fail-Safe Template</div>
        <span class="ai-kpi-hint">Otomatis beralih ke templat baku jika LLM gagal (AC-05)</span>
      </div>
    </div>

    <!-- Main Grid: 2 Columns -->
    <div class="ai-main-grid">
      <!-- Left Column: Parameter & Guardrails -->
      <div class="ai-left-col">
        <!-- Card: Parameter Inferensi Model -->
        <div class="ai-card">
          <div class="ai-card-head">
            <h3 class="ai-card-title">Parameter Inferensi Model (SRS §6.3)</h3>
            <span class="ai-card-tag">Konfigurasi Produksi</span>
          </div>
          <table class="ai-param-table">
            <tbody>
              <tr>
                <td>Model Utama</td>
                <td><strong>Google Gemini (Serverless / NFR-08)</strong></td>
              </tr>
              <tr>
                <td>Suhu (Temperature)</td>
                <td><code>0.2</code> (Keluaran deterministik, minim karangan)</td>
              </tr>
              <tr>
                <td>Batas Token</td>
                <td><code>T1: 900 · T2: 1.400 · T3: 250 token</code></td>
              </tr>
              <tr>
                <td>Batas Waktu (Timeout)</td>
                <td><code>10.0 detik</code> (1× otomatis percobaan ulang)</td>
              </tr>
              <tr>
                <td>Mode Respon</td>
                <td><code>Structured JSON (response_mime_type: application/json)</code></td>
              </tr>
              <tr>
                <td>Keamanan Masukan</td>
                <td>Sanitasi tag <code>&lt;data_pelapor&gt;</code> untuk cegah prompt injection</td>
              </tr>
              <tr>
                <td>Status Bobot Skor</td>
                <td>
                  <span class="ai-readonly-badge">🔒 Baca-Saja (Terkunci di backend scoring.json)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Card: Guardrail Frasa Terlarang -->
        <div class="ai-card">
          <div class="ai-card-head">
            <h3 class="ai-card-title">Guardrail Frasa Terlarang (forbidden_phrases.json)</h3>
            <span class="ai-card-tag is-danger">Pencegahan Defamasi</span>
          </div>
          <p class="ai-card-note">
            Keluaran diperiksa ketat (SRS §6.7). Jika melanggar, hasil dibatalkan dan digantikan templat cadangan.
          </p>
          <div class="ai-phrases-list">
            <span v-for="phrase in forbiddenPhrases" :key="phrase" class="ai-phrase-chip">
              ⊘ {{ phrase }}
            </span>
          </div>

          <div class="ai-notice-box">
            <strong>Pengecualian Frasa Resmi (SRS §6.7):</strong>
            <p>
              Kata "korupsi" diizinkan KHUSUS bila bagian dari nama lembaga resmi (misal: Komisi Pemberantasan Korupsi).
            </p>
          </div>
        </div>

        <!-- Card: Templat Cadangan Tanpa LLM -->
        <div class="ai-card">
          <div class="ai-card-head">
            <h3 class="ai-card-title">Templat Cadangan Tanpa LLM (SRS §6.9)</h3>
          </div>
          <p class="ai-card-note">
            Otomatis aktif bila kuota habis, waktu &gt; 10s, atau terpicu frasa terlarang:
          </p>
          <pre class="ai-template-box"><code>"Indikator [kode]: [uraian] — nilai [nilai], ambang [ambang]. Skor [skor]/100."
Penafian wajib: "Indikator risiko bukan bukti pelanggaran atau kesimpulan hukum."</code></pre>
        </div>
      </div>

      <!-- Right Column: Real-time logs notification & JSON Preview -->
      <div class="ai-right-col">
        <!-- Log Inferensi Notice -->
        <div class="ai-card">
          <div class="ai-card-head">
            <h3 class="ai-card-title">Log Inferensi Real-Time &amp; Uji Keamanan</h3>
            <span class="ai-pill-notice">Ditunda</span>
          </div>
          <div class="ai-stream-notice">
            <div class="ai-stream-icon">⚡</div>
            <div>
              <strong class="ai-stream-title">Pencatatan Telemetri Streaming Ditunda</strong>
              <p class="ai-stream-text">
                Pemantauan log streaming eksekusi per prompt (LLM-11) menunggu penyediaan endpoint telemetri live di backend.
                Proteksi inferensi saat ini berjalan terpusat pada service backend dengan penafian LLM-10 yang selalu disertakan.
              </p>
            </div>
          </div>
        </div>

        <!-- Pratinjau Skema JSON Terstruktur -->
        <div class="ai-card">
          <div class="ai-card-head">
            <h3 class="ai-card-title">Pratinjau Keluaran JSON Tervalidasi (SRS §6.5)</h3>
            <span class="ai-badge-json">JSON SKEMA</span>
          </div>
          <pre class="ai-json-box"><code>{
  "ringkasan": "Proyek mendapat skor risiko tinggi berdasarkan indikator kepatuhan.",
  "temuan": [
    {
      "kode_aturan": "D2-01",
      "penjelasan": "Tunggal penawar di bawah ambang batas kompetisi sehat.",
      "arti_bagi_warga": "Persaingan harga terbatas pada tender pengadaan."
    }
  ],
  "keterbatasan": ["Data bersumber dari publikasi resmi SiRUP dan SPSE."],
  "penafian": "Indikator risiko bukan bukti pelanggaran atau kesimpulan hukum."
}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const forbiddenPhrases = [
  'terbukti korupsi',
  'tersangka',
  'menggelapkan',
  'mark up',
  'penipuan',
  'melanggar hukum',
  'pasti salah',
  'nama perseorangan',
]
</script>

<style scoped>
.admin-ai-page {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  max-width: 1400px;
}

/* Header */
.ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
  padding-bottom: var(--sp-3);
  border-bottom: var(--bw) solid var(--c-border);
}
.ai-title {
  font-size: var(--fs-2xl);
  font-weight: 800;
  color: var(--c-ink);
  margin: 0 0 4px 0;
}
.ai-desc {
  font-size: var(--fs-sm);
  color: var(--c-muted);
  margin: 0;
}
.ai-head-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--c-success-soft);
  color: var(--c-success);
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--r-pill);
  border: 1px solid rgba(46, 139, 87, 0.2);
}
.ai-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-success);
}

/* KPI Row */
.ai-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--sp-4);
}
.ai-kpi-card {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-lg);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.ai-kpi-label {
  font-size: var(--fs-micro);
  font-weight: 700;
  color: var(--c-muted);
  letter-spacing: 0.5px;
}
.ai-kpi-val {
  font-size: 20px;
  font-weight: 800;
  color: var(--c-ink);
}
.ai-kpi-val.text-success { color: var(--c-success); }
.ai-kpi-val.text-info { color: var(--c-info); }
.ai-kpi-hint {
  font-size: var(--fs-xs);
  color: var(--c-subtle);
}

/* Grid Layout */
.ai-main-grid {
  display: grid;
  grid-template-columns: 7fr 5fr;
  gap: var(--sp-5);
  align-items: start;
}
.ai-left-col,
.ai-right-col {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

/* Cards */
.ai-card {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-lg);
  padding: 20px;
}
.ai-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.ai-card-title {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-ink);
  margin: 0;
}
.ai-card-tag {
  font-size: var(--fs-micro);
  font-weight: 700;
  background: var(--c-bg);
  color: var(--c-muted);
  padding: 2px 8px;
  border-radius: var(--r-pill);
}
.ai-card-tag.is-danger {
  background: var(--c-danger-soft);
  color: var(--c-danger);
}
.ai-card-note {
  font-size: var(--fs-xs);
  color: var(--c-muted);
  margin: 0 0 12px 0;
  line-height: 1.45;
}

/* Param Table */
.ai-param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-xs);
}
.ai-param-table td {
  padding: 10px 0;
  border-bottom: var(--bw) solid var(--c-border);
  color: var(--c-ink);
}
.ai-param-table tr:last-child td {
  border-bottom: none;
}
.ai-param-table td:first-child {
  color: var(--c-muted);
  font-weight: 600;
  width: 160px;
}
.ai-readonly-badge {
  font-size: var(--fs-micro);
  font-weight: 700;
  background: var(--c-warning-soft);
  color: var(--c-warning);
  padding: 3px 8px;
  border-radius: var(--r-pill);
}

/* Phrases chips */
.ai-phrases-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.ai-phrase-chip {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-danger);
  background: var(--c-danger-soft);
  padding: 4px 10px;
  border-radius: var(--r-sm);
  border: 1px solid rgba(214, 58, 31, 0.2);
}

.ai-notice-box {
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  padding: 12px;
  font-size: var(--fs-xs);
  color: var(--c-ink);
}
.ai-notice-box strong {
  display: block;
  margin-bottom: 2px;
}
.ai-notice-box p {
  margin: 0;
  color: var(--c-muted);
  line-height: 1.4;
}

.ai-template-box,
.ai-json-box {
  background: #1A1918;
  color: #A3E635;
  padding: 14px;
  border-radius: var(--r-md);
  font-family: monospace;
  font-size: 11px;
  line-height: 1.5;
  margin: 0;
  overflow-x: auto;
}
.ai-json-box {
  color: #F4F2EE;
}

/* Stream notice */
.ai-pill-notice {
  font-size: var(--fs-micro);
  font-weight: 700;
  background: var(--c-warning-soft);
  color: var(--c-warning);
  padding: 2px 8px;
  border-radius: var(--r-pill);
}
.ai-stream-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--c-bg);
  border: 1px dashed var(--c-border-strong);
  border-radius: var(--r-md);
}
.ai-stream-icon {
  font-size: 20px;
}
.ai-stream-title {
  display: block;
  font-size: var(--fs-sm);
  color: var(--c-ink);
  margin-bottom: 4px;
}
.ai-stream-text {
  font-size: var(--fs-xs);
  color: var(--c-muted);
  margin: 0;
  line-height: 1.45;
}

.ai-badge-json {
  font-size: var(--fs-micro);
  font-weight: 700;
  background: var(--c-bg);
  color: var(--c-muted);
  padding: 2px 8px;
  border-radius: var(--r-pill);
}

@media (max-width: 900px) {
  .ai-main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
