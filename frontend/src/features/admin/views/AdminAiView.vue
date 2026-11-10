<template>
  <div class="admin-ai-page">

    <!-- Topbar / Header -->
    <header class="ai-head">
      <div class="ai-title-group">
        <h1 class="ai-title">
          Pemantauan Model AI (LLM) &amp; Guardrails
        </h1>
      </div>
    </header>

    <!-- Subheader Tabs (Pill Tab Bar Konsisten dengan Daftar Proyek & Laporan) -->
    <nav class="ai-tabs-bar" aria-label="Tab pemantauan AI LLM">
      <div class="tabs-list">
        <button
          v-for="tab in aiTabs"
          :key="tab.value"
          class="tab-item"
          :class="{ 'is-active': activeTab === tab.value }"
          @click="switchTab(tab.value)"
        >
          <span>{{ tab.label }}</span>
          <span v-if="tab.count != null" class="tab-count" :class="tab.badgeClass">{{ tab.count }}</span>
        </button>
      </div>
    </nav>

    <!-- 4 KPI Cards (Ringkasan Eksekutif Model LLM & Guardrails) -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-card--success">
        <span class="kpi-label">STATUS PROVIDER LLM</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading" height="26px" width="120px" radius="6px" />
          <span v-else class="kpi-val text-success">Aktif</span>
        </div>
        <span class="kpi-sub">Suhu 0.2 · Minim Halusinasi</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">BATAS WAKTU &amp; TOKEN</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading" height="26px" width="130px" radius="6px" />
          <span v-else class="kpi-val">10.0s / 1.400 Token</span>
        </div>
        <span class="kpi-sub">T1: 900 · T2: 1.400 · T3: 250</span>
      </div>

      <div class="kpi-card kpi-card--danger">
        <span class="kpi-label">GUARDRAILS TERPASANG</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading" height="26px" width="110px" radius="6px" />
          <span v-else class="kpi-val text-danger">{{ forbiddenPhrases.length }} Frasa</span>
        </div>
        <span class="kpi-sub">Pencegahan defamasi &amp; praduga</span>
      </div>

      <div class="kpi-card kpi-card--warning">
        <span class="kpi-label">TOLERANSI GALAT (FAIL-SAFE)</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading" height="26px" width="130px" radius="6px" />
          <span v-else class="kpi-val text-warning">Cadangan Baku</span>
        </div>
        <span class="kpi-sub">Otomatis beralih ke templat baku</span>
      </div>
    </div>

    <!-- Alert Notifikasi Feedback / Salin -->
    <div v-if="feedback" class="alert-banner alert-banner--success">
      <div class="alert-left">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="alert-icon">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{{ feedback }}</span>
      </div>
      <button class="alert-close-btn" aria-label="Tutup notifikasi" @click="feedback = ''">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Kartu Filter & Aksi Mandiri (2 Baris Sesuai Mockup) -->
    <div class="ai-filter-card">
      <div class="filter-row-top">
        <div class="search-box">
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" />
            <line x1="9.5" y1="9.5" x2="13" y2="13" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari parameter, frasa terlarang, atau aturan..."
            aria-label="Pencarian parameter atau frasa"
          />
          <button v-if="searchQuery" class="search-clear-btn" aria-label="Hapus pencarian" @click="searchQuery = ''">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <select v-model="filterTask" class="filter-select">
          <option value="semua">Semua Tugas Model (T1, T2, T3)</option>
          <option value="T1">LLM-T1: Penjelasan Awam Proyek</option>
          <option value="T2">LLM-T2: Draf Surat Rekomendasi</option>
          <option value="T3">LLM-T3: Umpan Balik Laporan Warga</option>
        </select>
      </div>

      <div class="filter-row-bottom">
        <div class="filter-chips-group">
          <button
            class="chip-filter"
            :class="{ 'is-active': filterStrictOnly }"
            @click="filterStrictOnly = !filterStrictOnly"
          >
            <span class="chip-dot">●</span>
            <span>Mode Ketat (Deterministik)</span>
          </button>
          <button
            class="chip-filter"
            :class="{ 'is-active': filterExemptionOnly }"
            @click="filterExemptionOnly = !filterExemptionOnly"
          >
            <span class="chip-dot">●</span>
            <span>Pengecualian Nama Lembaga</span>
          </button>
        </div>

        <button class="btn-refresh" :disabled="loading" @click="refreshData">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'spin-icon': loading }">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>↻ Segarkan Status</span>
        </button>
      </div>
    </div>

    <!-- TAB 1: Parameter & Konfigurasi Model -->
    <div v-if="activeTab === 'params'" class="ai-table-card">
      <div class="table-card-head">
        <div>
          <h2 class="table-card-title">Parameter Inferensi Model LLM</h2>
          <p class="table-card-sub">
            Spesifikasi eksekusi inferensi Google Gemini (Serverless) dengan parameter deterministik.
          </p>
        </div>
        <span class="badge-tag">Konfigurasi Terkunci (Read-Only)</span>
      </div>

      <div class="table-container">
        <table class="ai-table">
          <thead>
            <tr>
              <th scope="col" style="width: 220px;">PARAMETER</th>
              <th scope="col" style="width: 260px;">NILAI AKTIF</th>
              <th scope="col">PENJELASAN &amp; TUJUAN TEKNIS</th>
              <th scope="col" style="width: 140px; text-align: center;">STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="param in filteredParams" :key="param.key">
              <td class="td-param-name">
                <strong>{{ param.name }}</strong>
                <span class="param-clause">{{ param.clause }}</span>
              </td>
              <td class="td-param-value">
                <code class="code-val">{{ param.value }}</code>
              </td>
              <td class="td-param-desc">
                <span>{{ param.desc }}</span>
              </td>
              <td class="td-param-status">
                <span class="badge-status-pill" :class="param.statusClass">
                  {{ param.statusText }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="card-footer-info">
        <div class="footer-note">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Bobot skor dan ambang risiko dikunci mati di <code>scoring.json</code> backend. LLM murni menyajikan narasi awam tanpa wewenang mengubah angka skor.</span>
        </div>
      </footer>
    </div>

    <!-- TAB 2: Guardrail Frasa Terlarang -->
    <div v-else-if="activeTab === 'guardrails'" class="ai-table-card">
      <div class="table-card-head">
        <div>
          <h2 class="table-card-title">Guardrail Pencegahan Frasa Terlarang</h2>
          <p class="table-card-sub">
            Filter leksikal ketat untuk mencegah pencemaran nama baik, prasangka tak berdasar, dan hoax.
          </p>
        </div>
        <span class="badge-tag badge-tag--danger">Pencegahan Defamasi</span>
      </div>

      <!-- Quick Chips Grid -->
      <div class="guardrail-chips-section">
        <h3 class="section-title">Daftar Frasa Terlarang Aktif (forbidden_phrases.json)</h3>
        <div class="chips-flex">
          <span v-for="phrase in filteredPhrases" :key="phrase" class="phrase-chip-item">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="chip-ban-icon">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <strong>{{ phrase }}</strong>
          </span>
        </div>
      </div>

      <!-- Exceptions Banner -->
      <div class="exception-alert-card">
        <div class="exception-icon-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div class="exception-text-box">
          <h4 class="exception-title">Pengecualian Frasa Resmi</h4>
          <p class="exception-desc">
            Kata <em>"korupsi"</em> diizinkan <strong>KHUSUS</strong> bila merupakan bagian utuh dari nama lembaga resmi negara, antara lain:
            <code>Komisi Pemberantasan Korupsi (KPK)</code>, <code>Badan Pemeriksa Keuangan (BPK)</code>, atau <code>Indonesia Corruption Watch (ICW)</code>.
            Penggunaan sebagai tuduhan sepihak pada entitas individu atau rekanan penyedia tetap otomatis diblokir sistem.
          </p>
        </div>
      </div>

      <!-- Tabel Detail Aturan Hukum Guardrails -->
      <div class="table-container">
        <table class="ai-table">
          <thead>
            <tr>
              <th scope="col" style="width: 200px;">FRASA / KATA KUNCI</th>
              <th scope="col" style="width: 200px;">KATEGORI PELANGGARAN</th>
              <th scope="col">TINDAKAN OTOMATIS SISTEM</th>
              <th scope="col" style="width: 140px; text-align: center;">STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in guardrailRules" :key="rule.phrase">
              <td class="td-param-name">
                <code class="code-danger">"{{ rule.phrase }}"</code>
              </td>
              <td class="td-param-desc">
                <strong>{{ rule.category }}</strong>
              </td>
              <td class="td-param-desc">
                <span>{{ rule.action }}</span>
              </td>
              <td class="td-param-status">
                <span class="badge-status-pill badge-status--blocked">DIBLOKIR</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: Skema JSON & Templat Fail-Safe -->
    <div v-else-if="activeTab === 'schemas'" class="ai-table-card">
      <div class="table-card-head">
        <div>
          <h2 class="table-card-title">Skema Keluaran JSON Terstruktur &amp; Fail-Safe</h2>
          <p class="table-card-sub">
            Format keluaran JSON deterministik dan mekanisme cadangan baku saat kuota/waktu habis.
          </p>
        </div>
        <span class="badge-tag">Format Standar Nasional</span>
      </div>

      <div class="schemas-grid-layout">
        <!-- Panel Kiri: JSON Schema Preview -->
        <div class="schema-code-box">
          <div class="code-box-header">
            <div class="code-box-title">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span>Skema Keluaran JSON Terstruktur</span>
            </div>
            <button class="btn-copy-code" @click="copyCode(jsonSchemaString, 'Skema JSON')">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Salin Skema</span>
            </button>
          </div>
          <pre class="dark-terminal-pre"><code><span class="tok-brace">{</span>
  <span class="tok-key">"ringkasan"</span>: <span class="tok-str">"Proyek mendapat skor risiko tinggi berdasarkan indikator kepatuhan."</span>,
  <span class="tok-key">"temuan"</span>: <span class="tok-bracket">[</span>
    <span class="tok-brace">{</span>
      <span class="tok-key">"kode_aturan"</span>: <span class="tok-str">"D2-01"</span>,
      <span class="tok-key">"penjelasan"</span>: <span class="tok-str">"Tunggal penawar di bawah ambang batas kompetisi sehat."</span>,
      <span class="tok-key">"arti_bagi_warga"</span>: <span class="tok-str">"Persaingan harga terbatas pada tender pengadaan."</span>
    <span class="tok-brace">}</span>
  <span class="tok-bracket">]</span>,
  <span class="tok-key">"keterbatasan"</span>: <span class="tok-bracket">[</span><span class="tok-str">"Data bersumber dari publikasi resmi SiRUP dan SPSE."</span><span class="tok-bracket">]</span>,
  <span class="tok-key">"penafian"</span>: <span class="tok-str">"Indikator risiko bukan bukti pelanggaran atau kesimpulan hukum."</span>
<span class="tok-brace">}</span></code></pre>
        </div>

        <!-- Panel Kanan: Template Fail-Safe Preview -->
        <div class="schema-code-box">
          <div class="code-box-header">
            <div class="code-box-title">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>Templat Cadangan Fail-Safe Tanpa LLM</span>
            </div>
            <button class="btn-copy-code" @click="copyCode(templateFailSafeString, 'Templat Fail-Safe')">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Salin Templat</span>
            </button>
          </div>
          <pre class="dark-terminal-pre"><code><span class="tok-comment">/* Otomatis aktif saat timeout &gt; 10s, kuota habis, atau galat skema */</span>

<span class="tok-key">"Indikator [kode_aturan]: [uraian_aturan] — nilai [nilai], ambang batas [ambang].
Skor terhitung [skor]/100. Sumber: [sumber_data], per [tanggal_data]."</span>

<span class="tok-warn">Penafian Wajib:</span>
<span class="tok-str">"Indikator risiko bukan bukti pelanggaran atau kesimpulan hukum."</span></code></pre>
        </div>
      </div>
    </div>

    <!-- TAB 4: Simulator Guardrail (Interactive Sandbox) -->
    <div v-else-if="activeTab === 'simulator'" class="ai-table-card">
      <div class="table-card-head">
        <div>
          <h2 class="table-card-title">Simulator &amp; Pengujian Guardrail Interaktif</h2>
          <p class="table-card-sub">
            Uji kalimat teks secara real-time terhadap mesin penyaring frasa terlarang dan pengecualian resmi.
          </p>
        </div>
        <span class="badge-tag badge-tag--active">Live Sandbox</span>
      </div>

      <div class="simulator-wrapper">
        <div class="simulator-input-card">
          <label for="sim-input" class="sim-label">Teks Masukan / Kalimat Uji Coba:</label>
          <textarea
            id="sim-input"
            v-model="simulatorText"
            class="sim-textarea"
            rows="4"
            placeholder="Ketik kalimat untuk menguji filter guardrail (contoh: Proyek ini diduga ada mark up anggaran, namun Komisi Pemberantasan Korupsi belum menerima laporan)."
          />
          <div class="sim-actions-row">
            <div class="sim-presets">
              <span class="preset-label">Uji Preset Cepat:</span>
              <button class="btn-preset" @click="applyPreset(1)">Preset Lolos</button>
              <button class="btn-preset is-danger" @click="applyPreset(2)">Preset Terlarang</button>
              <button class="btn-preset is-warning" @click="applyPreset(3)">Preset Lembaga KPK</button>
            </div>
            <button class="btn-run-sim" :disabled="!simulatorText.trim()" @click="runSimulation">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Uji Kalimat Terhadap Guardrail</span>
            </button>
          </div>
        </div>

        <!-- Hasil Evaluasi Simulator -->
        <div v-if="simulationDone" class="simulator-result-box" :class="simulationResultClass">
          <div class="result-header">
            <div class="result-title-group">
              <span class="result-status-indicator" />
              <h3 class="result-title">{{ simulationTitle }}</h3>
            </div>
            <span class="result-badge">{{ simulationBadgeText }}</span>
          </div>

          <p class="result-summary">{{ simulationSummary }}</p>

          <div v-if="detectedForbidden.length > 0" class="detected-box is-forbidden">
            <span class="detected-label">Frasa Terlarang Terdeteksi (Ditolak Sistem):</span>
            <div class="detected-tags">
              <span v-for="word in detectedForbidden" :key="word" class="tag-forbidden">
                ⊘ {{ word }}
              </span>
            </div>
            <p class="detected-desc">
              Keluaran otomatis dibatalkan dan dialihkan ke templat cadangan standar.
            </p>
          </div>

          <div v-if="detectedExceptions.length > 0" class="detected-box is-exempt">
            <span class="detected-label">Pengecualian Sah Diizinkan:</span>
            <div class="detected-tags">
              <span v-for="word in detectedExceptions" :key="word" class="tag-exempt">
                ✓ {{ word }}
              </span>
            </div>
            <p class="detected-desc">
              Kata "korupsi" sah karena merujuk kepada nama lembaga resmi negara.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

// State
const activeTab = ref('params')
const loading = ref(false)
const feedback = ref('')
const searchQuery = ref('')
const filterTask = ref('semua')
const filterStrictOnly = ref(false)
const filterExemptionOnly = ref(false)

// Tabs Configuration
const aiTabs = computed(() => [
  { value: 'params', label: 'Parameter & Konfigurasi' },
  { value: 'guardrails', label: 'Guardrail Frasa Terlarang' },
  { value: 'schemas', label: 'Skema JSON & Fail-Safe' },
  { value: 'simulator', label: 'Simulator Guardrail', count: 'Live', badgeClass: 'tab-count--warning' },
])

function switchTab(tabVal) {
  activeTab.value = tabVal
}

// Master Forbidden Phrases (config/forbidden_phrases.json)
const forbiddenPhrases = [
  'terbukti korupsi',
  'korupsi',
  'pelaku',
  'tersangka',
  'menggelapkan',
  'mark up',
  'penipuan',
  'melanggar hukum',
  'pasti',
]

// Rules Details for Guardrails Table
const guardrailRules = [
  { phrase: 'terbukti korupsi', category: 'Vonis Hukum Dini', action: 'Pembatalan output total; fallback templat cadangan' },
  { phrase: 'tersangka', category: 'Status Pidana Sepihak', action: 'Dilarang keras; penggantian otomatis ke templat baku' },
  { phrase: 'pelaku', category: 'Penetapan Subjek Pidana', action: 'Dilarang tanpa penetapan pengadilan berkekuatan tetap' },
  { phrase: 'menggelapkan', category: 'Tuduhan Delik Kejahatan', action: 'Penolakan inferensi; pencegahan pencemaran nama baik' },
  { phrase: 'mark up', category: 'Frasa Slang Spekulatif', action: 'Ganti istilah ke deviasi nilai HPS terhadap pagu resmi' },
  { phrase: 'penipuan', category: 'Tuduhan Pidana Umum', action: 'Ditolak skema validasi keluaran sistem' },
  { phrase: 'melanggar hukum', category: 'Kesimpulan Yuridis Mutlak', action: 'Hanya aparat berwenang; sistem hanya sajikan indikator' },
  { phrase: 'pasti', category: 'Ketidakpastian Probabilistik', action: 'Dihapus dari kamus; sistem memakai skor probabilitas risiko' },
  { phrase: 'korupsi', category: 'Dikecualikan Nama Lembaga', action: 'Hanya sah untuk "Komisi Pemberantasan Korupsi" / KPK' },
]

// Parameter List
const parametersList = [
  {
    key: 'provider',
    name: 'Model Provider',
    clause: 'Infrastruktur Serverless',
    value: 'Google Gemini (Serverless)',
    desc: 'Infrastruktur inferensi serverless tanpa penyimpanan lokal teks non-anonim.',
    statusClass: 'badge-status--active',
    statusText: 'TERKONEKSI',
  },
  {
    key: 'temperature',
    name: 'Suhu (Temperature)',
    clause: 'Parameter Deterministik',
    value: '0.2',
    desc: 'Keluaran sangat deterministik, konsisten antar pemanggilan, dan meminimalkan halusinasi.',
    statusClass: 'badge-status--active',
    statusText: 'DETERMINISTIK',
  },
  {
    key: 'tokens',
    name: 'Batas Token Keluaran',
    clause: 'Alokasi Kuota Token',
    value: 'T1: 900 · T2: 1.400 · T3: 250',
    desc: 'Alokasi token ketat sesuai batasan skema JSON terstruktur per tipe tugas.',
    statusClass: 'badge-status--active',
    statusText: 'TERBATASI',
  },
  {
    key: 'timeout',
    name: 'Batas Waktu (Timeout)',
    clause: 'Batas Waktu Toleransi',
    value: '10.0 detik (1× retry)',
    desc: 'Maksimal eksekusi 10 detik; gagal otomatis memicu fallback templat cadangan.',
    statusClass: 'badge-status--active',
    statusText: 'AKTIF',
  },
  {
    key: 'response_mode',
    name: 'Mode Respon',
    clause: 'Standar Format JSON',
    value: 'application/json',
    desc: 'Mode response_mime_type terstruktur dengan validasi skema JSON ketat.',
    statusClass: 'badge-status--active',
    statusText: 'TERVALIDASI',
  },
  {
    key: 'sanitization',
    name: 'Keamanan Masukan',
    clause: 'Keamanan Masukan Pelapor',
    value: '<data_pelapor> (Maks 500 chars)',
    desc: 'Sanitasi teks pelapor bebas dari instruksi prompt injection sebelum diserahkan ke LLM.',
    statusClass: 'badge-status--active',
    statusText: 'TERLINDUNGI',
  },
  {
    key: 'score_lock',
    name: 'Kunci Perhitungan Skor',
    clause: 'Integritas Skor Terkunci',
    value: 'Terkunci (Read-Only scoring.json)',
    desc: 'LLM tidak pernah menghitung skor atau menggeser bobot; skor final murni dari backend.',
    statusClass: 'badge-status--locked',
    statusText: 'TERKUNCI BACA',
  },
]

// Filtered Computed
const filteredParams = computed(() => {
  return parametersList.filter((p) => {
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const match = p.name.toLowerCase().includes(q) || p.value.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)
      if (!match) return false
    }
    if (filterStrictOnly.value && p.key !== 'temperature' && p.key !== 'response_mode') {
      return false
    }
    return true
  })
})

const filteredPhrases = computed(() => {
  return forbiddenPhrases.filter((p) => {
    if (searchQuery.value) {
      return p.toLowerCase().includes(searchQuery.value.toLowerCase())
    }
    return true
  })
})

// Refresh action
function refreshData() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    feedback.value = 'Status guardrail dan parameter inferensi model berhasil diperbarui.'
  }, 400)
}

// Code Copy helper
const jsonSchemaString = `{
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
}`

const templateFailSafeString = `"Indikator [kode_aturan]: [uraian_aturan] — nilai [nilai], ambang batas [ambang]. Skor terhitung [skor]/100. Sumber: [sumber_data], per [tanggal_data]."

Penafian Wajib:
"Indikator risiko bukan bukti pelanggaran atau kesimpulan hukum."`

function copyCode(content, title) {
  navigator.clipboard.writeText(content).then(() => {
    feedback.value = `${title} berhasil disalin ke papan klip!`
  })
}

// Interactive Simulator State
const simulatorText = ref('')
const simulationDone = ref(false)
const detectedForbidden = ref([])
const detectedExceptions = ref([])

function applyPreset(id) {
  if (id === 1) {
    simulatorText.value = 'Proyek ini memiliki nilai HPS sebesar Rp7,3 miliar dengan metode pemilihan tender terbatas berdasarkan publikasi SiRUP LPSE Provinsi Lampung.'
  } else if (id === 2) {
    simulatorText.value = 'Kontraktor proyek jalan ini merupakan tersangka yang terbukti korupsi dan melakukan mark up anggaran secara melanggar hukum.'
  } else if (id === 3) {
    simulatorText.value = 'Berdasarkan koordinasi bersama Komisi Pemberantasan Korupsi dan BPK RI, proyek pengadaan ini masuk radar pemantauan publik.'
  }
  runSimulation()
}

function runSimulation() {
  const text = simulatorText.value.toLowerCase()
  detectedForbidden.value = []
  detectedExceptions.value = []

  // Check exceptions first
  if (text.includes('komisi pemberantasan korupsi')) {
    detectedExceptions.value.push('Komisi Pemberantasan Korupsi (KPK)')
  }
  if (text.includes('bpk') || text.includes('badan pemeriksa keuangan')) {
    detectedExceptions.value.push('Badan Pemeriksa Keuangan (BPK)')
  }
  if (text.includes('icw') || text.includes('indonesia corruption watch')) {
    detectedExceptions.value.push('Indonesia Corruption Watch (ICW)')
  }

  // Check forbidden phrases
  for (const phrase of forbiddenPhrases) {
    if (phrase === 'korupsi') {
      // Dikecualikan bila hanya ada dalam Komisi Pemberantasan Korupsi
      const stripped = text.replace(/komisi pemberantasan korupsi/g, '')
      if (stripped.includes('korupsi')) {
        detectedForbidden.value.push(phrase)
      }
    } else if (text.includes(phrase)) {
      detectedForbidden.value.push(phrase)
    }
  }

  simulationDone.value = true
}

const simulationResultClass = computed(() => {
  if (detectedForbidden.value.length > 0) return 'is-danger'
  if (detectedExceptions.value.length > 0) return 'is-success'
  return 'is-neutral'
})

const simulationTitle = computed(() => {
  if (detectedForbidden.value.length > 0) return 'Pelanggaran Guardrail: Teks Ditolak Sistem'
  if (detectedExceptions.value.length > 0) return 'Teks Lolos Evaluasi (Dengan Pengecualian Resmi)'
  return 'Teks Bersih & Lolos Evaluasi Guardrail'
})

const simulationBadgeText = computed(() => {
  if (detectedForbidden.value.length > 0) return 'STATUS: DIBLOKIR SISTEM'
  if (detectedExceptions.value.length > 0) return 'STATUS: DISETUJUI DENGAN PENGECUALIAN'
  return 'STATUS: DISETUJUI SISTEM'
})

const simulationSummary = computed(() => {
  if (detectedForbidden.value.length > 0) {
    return 'Ditemukan frasa yang dilarang keras dalam inferensi LLM publik. Mesin guardrail akan membatalkan seluruh keluaran ini dan menyajikan templat cadangan standar.'
  }
  if (detectedExceptions.value.length > 0) {
    return 'Teks dinyatakan aman. Penyebutan kata yang diawasi diizinkan karena terbukti merupakan nama lembaga pengawasan resmi negara yang diakui.'
  }
  return 'Tidak ada indikasi kata terlarang, vonis hukum sepihak, atau pencemaran nama baik. Teks memenuhi standar keamanan inferensi.'
})
</script>

<style scoped>
.admin-ai-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* Breadcrumb Tag */
.ai-breadcrumb-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  padding: 4px 12px;
  border-radius: 999px;
  width: fit-content;
}

.ai-breadcrumb-tag .dot-orange {
  color: #ff5c00;
  font-size: 12px;
}

/* Header */
.ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.ai-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ai-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--c-ink, #111111);
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.ai-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--c-muted, #6B6760);
  letter-spacing: 0;
}

.sync-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #059669;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* Subheader Tabs Bar */
.ai-tabs-bar {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 12px;
  padding: 4px 8px;
  overflow-x: auto;
}

.tabs-list {
  display: flex;
  gap: 4px;
  min-width: max-content;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab-item:hover {
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
}

.tab-item.is-active {
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
  box-shadow: inset 0 -2px 0 #ff5c00;
}

.tab-count {
  padding: 1px 7px;
  font-size: 10px;
  border-radius: 999px;
  background: #e5e3dc;
  color: #4b5563;
  font-weight: 700;
}

.tab-count--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.tab-count--warning {
  background: #fef3c7;
  color: #b45309;
}

/* 4 KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.kpi-card {
  padding: 16px 18px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 94px;
  transition: border-color 0.15s ease;
}

.kpi-card--success { border-left: 3.5px solid #16a34a; }
.kpi-card--danger { border-left: 3.5px solid #dc2626; }
.kpi-card--warning { border-left: 3.5px solid #d97706; }

.kpi-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--c-muted, #6B6760);
}

.kpi-val-row {
  min-height: 28px;
  display: flex;
  align-items: baseline;
  margin: 4px 0 2px 0;
}

.kpi-val {
  font-size: 18px;
  font-weight: 800;
  color: var(--c-ink, #111111);
}

.text-success { color: #16a34a; }
.text-danger { color: #dc2626; }
.text-warning { color: #d97706; }

.kpi-sub {
  font-size: 11px;
  color: var(--c-subtle, #9CA3AF);
  font-weight: 500;
}

/* Alert Banner */
.alert-banner {
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
}

.alert-banner--success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}

.alert-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-close-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  padding: 2px;
}

/* Kartu Filter Mandiri */
.ai-filter-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 16px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row-top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  background: #F8F7F4;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  flex: 1;
  min-width: 240px;
  color: var(--c-muted, #6B6760);
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-family: inherit;
  font-size: 11.5px;
  color: var(--c-ink, #111111);
  width: 100%;
}

.search-clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--c-muted, #6B6760);
  display: flex;
  padding: 0;
}

.filter-select {
  height: 34px;
  padding: 0 28px 0 12px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--c-ink, #111111);
  background: #F8F7F4;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='%236B6760'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' stroke='%236B6760' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  appearance: none;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  outline: none;
}

.filter-row-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-chips-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chip-filter {
  height: 32px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  background: #F8F7F4;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  color: var(--c-muted, #6B6760);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.chip-filter .chip-dot {
  color: #ff5c00;
  font-size: 9px;
}

.chip-filter.is-active {
  background: #FFFBEB;
  border-color: #F59E0B;
  color: #92400E;
}

.btn-refresh {
  height: 32px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: #FFFFFF;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: #F8F7F4;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Standalone Card Konten Utama */
.ai-table-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 16px;
  overflow: hidden;
}

.table-card-head {
  padding: 18px 24px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.table-card-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--c-ink, #111111);
  margin: 0 0 4px 0;
}

.table-card-sub {
  font-size: 12px;
  color: var(--c-muted, #6B6760);
  margin: 0;
}

.badge-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: #F4F2EE;
  color: #4b5563;
  border: 1px solid var(--c-border, #E7E3DC);
}

.badge-tag--danger {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fca5a5;
}

.badge-tag--active {
  background: #ffedd5;
  color: #c2410c;
  border-color: #fdba74;
}

/* Table Style */
.table-container {
  overflow-x: auto;
}

.ai-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

.ai-table thead th {
  background: #FAF8F5;
  color: var(--c-muted, #6B6760);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 10px 18px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
}

.ai-table tbody tr {
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  transition: background 0.1s ease;
}

.ai-table tbody tr:hover {
  background: #FAF8F5;
}

.ai-table tbody tr:last-child {
  border-bottom: none;
}

.ai-table td {
  padding: 12px 18px;
  vertical-align: middle;
}

.td-param-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.td-param-name strong {
  font-size: 12px;
  color: var(--c-ink, #111111);
}

.param-clause {
  font-size: 10px;
  color: var(--c-muted, #6B6760);
}

.code-val {
  font-family: monospace;
  font-size: 11px;
  padding: 3px 6px;
  background: #F4F2EE;
  border: 1px solid #E7E3DC;
  border-radius: 6px;
  color: #111111;
  font-weight: 600;
}

.code-danger {
  font-family: monospace;
  font-size: 12px;
  padding: 3px 8px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  color: #b91c1c;
  font-weight: 700;
}

.td-param-desc {
  font-size: 11.5px;
  color: var(--c-muted, #6B6760);
  line-height: 1.45;
}

.badge-status-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.badge-status--active {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.badge-status--locked {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.badge-status--blocked {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
}

.card-footer-info {
  padding: 14px 20px;
  background: #FAF8F5;
  border-top: 1px solid var(--c-border, #E7E3DC);
}

.footer-note {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

/* Guardrails Tab Style */
.guardrail-chips-section {
  padding: 18px 24px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--c-ink, #111111);
  margin: 0 0 12px 0;
}

.chips-flex {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.phrase-chip-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  font-size: 11.5px;
  color: #991b1b;
}

.chip-ban-icon {
  color: #dc2626;
}

.exception-alert-card {
  margin: 18px 24px;
  padding: 16px;
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 12px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.exception-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #DCFCE7;
  color: #16A34A;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.exception-title {
  font-size: 13px;
  font-weight: 800;
  color: #166534;
  margin: 0 0 4px 0;
}

.exception-desc {
  font-size: 11.5px;
  color: #14532D;
  margin: 0;
  line-height: 1.5;
}

.exception-desc code {
  background: #DCFCE7;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

/* Tab 3: Schemas Style */
.schemas-grid-layout {
  padding: 20px 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.schema-code-box {
  background: #111827;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.code-box-header {
  padding: 10px 16px;
  background: #1F2937;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #374151;
}

.code-box-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #F3F4F6;
}

.btn-copy-code {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 600;
  color: #E5E7EB;
  background: #374151;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-copy-code:hover {
  background: #4B5563;
}

.dark-terminal-pre {
  margin: 0;
  padding: 16px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1.55;
  color: #E5E7EB;
  overflow-x: auto;
  flex: 1;
}

.tok-brace, .tok-bracket { color: #FBBF24; font-weight: 700; }
.tok-key { color: #60A5FA; font-weight: 600; }
.tok-str { color: #34D399; }
.tok-comment { color: #9CA3AF; font-style: italic; }
.tok-warn { color: #F87171; font-weight: 700; }

/* Tab 4: Simulator Style */
.simulator-wrapper {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.simulator-input-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sim-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--c-ink, #111111);
}

.sim-textarea {
  width: 100%;
  padding: 14px 16px;
  background: #F8F7F4;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 12px;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--c-ink, #111111);
  outline: none;
  transition: border-color 0.15s ease;
}

.sim-textarea:focus {
  border-color: #ff5c00;
  background: #FFFFFF;
}

.sim-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.sim-presets {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 11px;
  color: var(--c-muted, #6B6760);
  font-weight: 600;
}

.btn-preset {
  padding: 4px 10px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 6px;
  background: #F4F2EE;
  border: 1px solid var(--c-border, #E7E3DC);
  color: var(--c-ink, #111111);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-preset:hover {
  background: #EAE6DF;
}

.btn-preset.is-danger {
  background: #FEE2E2;
  border-color: #FECACA;
  color: #B91C1C;
}

.btn-preset.is-warning {
  background: #FEF3C7;
  border-color: #FDE68A;
  color: #B45309;
}

.btn-run-sim {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  font-size: 12px;
  font-weight: 700;
  color: #FFFFFF;
  background: #ff5c00;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-run-sim:hover:not(:disabled) {
  background: #e65300;
}

.btn-run-sim:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Simulator Result Box */
.simulator-result-box {
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--c-border, #E7E3DC);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.simulator-result-box.is-danger {
  background: #FEF2F2;
  border-color: #FECACA;
}

.simulator-result-box.is-success {
  background: #F0FDF4;
  border-color: #BBF7D0;
}

.simulator-result-box.is-neutral {
  background: #F9FAFB;
  border-color: #E5E7EB;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.result-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.is-danger .result-status-indicator { background: #DC2626; }
.is-success .result-status-indicator { background: #16A34A; }
.is-neutral .result-status-indicator { background: #2563EB; }

.result-title {
  font-size: 14px;
  font-weight: 800;
  margin: 0;
  color: var(--c-ink, #111111);
}

.result-badge {
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}

.is-danger .result-badge { background: #FEE2E2; color: #B91C1C; }
.is-success .result-badge { background: #DCFCE7; color: #15803D; }
.is-neutral .result-badge { background: #DBEAFE; color: #1E40AF; }

.result-summary {
  font-size: 12px;
  line-height: 1.5;
  color: var(--c-ink, #111111);
  margin: 0;
}

.detected-box {
  padding: 12px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detected-box.is-forbidden {
  background: #FFFFFF;
  border: 1px solid #FCA5A5;
}

.detected-box.is-exempt {
  background: #FFFFFF;
  border: 1px solid #86EFAC;
}

.detected-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--c-muted, #6B6760);
}

.detected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-forbidden {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  background: #FEE2E2;
  color: #B91C1C;
  border-radius: 6px;
}

.tag-exempt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  background: #DCFCE7;
  color: #15803D;
  border-radius: 6px;
}

.detected-desc {
  font-size: 11px;
  color: var(--c-muted, #6B6760);
  margin: 2px 0 0 0;
}

/* Responsiveness */
@media (max-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .schemas-grid-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .kpi-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .ai-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .filter-row-top {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-select {
    width: 100%;
  }
  .sim-presets-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  .sim-presets-bar .btn-preset {
    width: 100%;
    justify-content: center;
  }
  .sim-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-eval,
  .btn-clear {
    width: 100%;
    justify-content: center;
  }
  .ai-table {
    min-width: 750px;
  }
}
</style>
