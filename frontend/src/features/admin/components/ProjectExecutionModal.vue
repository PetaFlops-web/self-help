<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="exec-title">
      <!-- Head -->
      <div class="modal-head">
        <div>
          <span class="badge-exec">DATA EKSEKUSI PROYEK (SRC-10)</span>
          <h3 id="exec-title" class="modal-title">Kelola Eksekusi Proyek</h3>
          <p class="modal-sub">
            Proyek: <strong>{{ project?.nama }}</strong> · Nilai Kontrak: <strong>{{ formatCurrency(project?.nilai_kontrak || project?.pagu) }}</strong>
          </p>
        </div>
        <button class="btn-close" aria-label="Tutup modal" @click="close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Tab Bar -->
      <div class="tab-nav">
        <button
          type="button"
          class="tab-btn"
          :class="{ 'is-active': activeTab === 'rab' }"
          @click="activeTab = 'rab'"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Rincian RAB ({{ rabItems.length }})</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ 'is-active': activeTab === 'payments' }"
          @click="activeTab = 'payments'"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20M7 15h2" />
          </svg>
          <span>Termin Pembayaran ({{ payments.length }})</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ 'is-active': activeTab === 'progress' }"
          @click="activeTab = 'progress'"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
            <path d="M3 3v18h18M7 15l4-4 4 4 6-6" />
          </svg>
          <span>Progres Fisik ({{ progressList.length }})</span>
        </button>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <!-- Error & Success Alert -->
        <div v-if="errorMsg" class="alert-box alert-box--danger">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" class="alert-icon">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <p>{{ errorMsg }}</p>
        </div>
        <div v-if="successMsg" class="alert-box alert-box--success">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" class="alert-icon">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <p>{{ successMsg }}</p>
        </div>

        <!-- ============================================== -->
        <!-- TAB 1: RINCIAN RAB                           -->
        <!-- ============================================== -->
        <div v-if="activeTab === 'rab'" class="tab-pane">
          <div class="section-head">
            <div>
              <h4 class="section-title">Item Anggaran Rinci (RAB)</h4>
              <p class="section-desc">Dokumen rincian harga satuan untuk analisis deviasi terhadap standar harga acuan (D1 &amp; D2).</p>
            </div>
            <button
              v-if="!showRabForm"
              class="btn-primary-action"
              @click="openAddRabForm"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Tambah Item RAB</span>
            </button>
          </div>

          <!-- Subform Tambah/Edit RAB -->
          <div v-if="showRabForm" class="subform-card">
            <h5 class="subform-title">{{ editingRabId ? 'Ubah Item Anggaran' : 'Tambah Item Anggaran Baru' }}</h5>
            <form class="grid-form" @submit.prevent="saveRabItem">
              <div class="form-group col-full">
                <label>Uraian Pekerjaan / Material <span class="req">*</span></label>
                <input
                  v-model="rabForm.uraian"
                  type="text"
                  placeholder="Contoh: Semen Portland Type 1 atau Galian Tanah Biasa"
                  required
                />
              </div>

              <div class="form-group col-2">
                <label>Satuan Ukuran <span class="req">*</span></label>
                <input
                  v-model="rabForm.satuan"
                  type="text"
                  placeholder="m3 / m2 / sak / kg / paket"
                  required
                />
              </div>

              <div class="form-group col-2">
                <label>Volume / Kuantitas <span class="req">*</span></label>
                <input
                  v-model.number="rabForm.volume"
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="Contoh: 150"
                  required
                />
              </div>

              <div class="form-group col-2">
                <label>Harga Satuan (Rp) <span class="req">*</span></label>
                <input
                  v-model.number="rabForm.harga_satuan"
                  type="number"
                  min="1"
                  placeholder="Contoh: 85000"
                  required
                />
              </div>

              <div class="form-group col-2">
                <label>Kode Harga Acuan Standar (Opsional)</label>
                <input
                  v-model="rabForm.kode_harga_acuan"
                  type="text"
                  placeholder="Contoh: HA-SMN-01 (opsional)"
                />
              </div>

              <div class="form-actions col-full">
                <button type="button" class="btn-cancel" :disabled="submitting" @click="cancelRabForm">
                  Batal
                </button>
                <button type="submit" class="btn-save" :disabled="submitting">
                  <svg v-if="!submitting" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{{ submitting ? 'Menyimpan…' : 'Simpan Item' }}</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Loading RAB -->
          <div v-if="loadingRab" class="table-loading">
            <SkeletonBlock height="36px" width="100%" radius="4px" />
            <SkeletonBlock height="36px" width="100%" radius="4px" />
          </div>

          <!-- Empty RAB -->
          <div v-else-if="rabItems.length === 0 && !showRabForm" class="empty-state">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="empty-title">Belum ada item anggaran rincian (RAB)</p>
            <p class="empty-desc">Klik tombol "Tambah Item RAB" untuk memasukkan rincian item anggaran pekerjaan.</p>
          </div>

          <!-- Tabel RAB -->
          <div v-else-if="!showRabForm" class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">URAIAN PEKERJAAN</th>
                  <th scope="col">VOLUME</th>
                  <th scope="col">HARGA SATUAN</th>
                  <th scope="col">TOTAL NILAI</th>
                  <th scope="col">ACUAN / DEVIASI</th>
                  <th scope="col" class="th-actions">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in rabItems" :key="item.id">
                  <td>
                    <div class="row-title">{{ item.uraian }}</div>
                  </td>
                  <td>
                    <span class="val-mono">{{ item.volume }}</span> {{ item.satuan }}
                  </td>
                  <td>
                    <span class="val-mono">{{ formatCurrency(item.harga_satuan) }}</span>
                  </td>
                  <td>
                    <strong class="val-mono">{{ formatCurrency(item.total || (Number(item.volume) * Number(item.harga_satuan))) }}</strong>
                  </td>
                  <td>
                    <div v-if="item.kode_harga_acuan" class="acuan-info">
                      <span class="acuan-code">{{ item.kode_harga_acuan }}</span>
                      <span v-if="item.deviasi_pct !== null" :class="['deviasi-pill', Number(item.deviasi_pct) > 0 ? 'is-danger' : 'is-success']">
                        {{ Number(item.deviasi_pct) > 0 ? '+' : '' }}{{ item.deviasi_pct }}%
                      </span>
                    </div>
                    <span v-else class="text-muted">—</span>
                  </td>
                  <td class="td-actions">
                    <button class="action-btn is-edit" title="Ubah item" @click="openEditRabForm(item)">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button class="action-btn is-delete" title="Hapus item" @click="confirmDeleteRab(item)">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- TAB 2: TERMIN PEMBAYARAN                     -->
        <!-- ============================================== -->
        <div v-if="activeTab === 'payments'" class="tab-pane">
          <div class="section-head">
            <div>
              <h4 class="section-title">Termin Pembayaran Kontrak</h4>
              <p class="section-desc">Pencatatan realisasi pencairan SP2D untuk pengawasan anomali arus kas (Dimensi D4).</p>
            </div>
            <button
              v-if="!showPaymentForm"
              class="btn-primary-action"
              @click="openAddPaymentForm"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Tambah Termin</span>
            </button>
          </div>

          <!-- Ringkasan Keuangan Mini -->
          <div v-if="financialSummary" class="kpi-mini-grid">
            <div class="kpi-mini-card">
              <span class="kpi-mini-label">Total Pencairan</span>
              <strong class="kpi-mini-val">{{ formatCurrency(financialSummary.total_dibayar) }}</strong>
            </div>
            <div class="kpi-mini-card">
              <span class="kpi-mini-label">Persen Kontrak Dicairkan</span>
              <strong class="kpi-mini-val">{{ financialSummary.persen_dibayar }}%</strong>
            </div>
            <div class="kpi-mini-card">
              <span class="kpi-mini-label">Sisa Persen Kontrak</span>
              <strong class="kpi-mini-val">{{ financialSummary.sisa_persen }}%</strong>
            </div>
          </div>

          <!-- Subform Tambah/Edit Pembayaran -->
          <div v-if="showPaymentForm" class="subform-card">
            <h5 class="subform-title">{{ editingPaymentId ? 'Ubah Termin Pembayaran' : 'Tambah Termin Pencairan Baru' }}</h5>
            <form class="grid-form" @submit.prevent="savePayment">
              <div class="form-group col-2">
                <label>Termin Ke- <span class="req">*</span></label>
                <input
                  v-model.number="paymentForm.termin_ke"
                  type="number"
                  min="1"
                  max="20"
                  placeholder="Contoh: 1"
                  required
                />
              </div>

              <div class="form-group col-2">
                <label>Tanggal Pencairan (SP2D) <span class="req">*</span></label>
                <input
                  v-model="paymentForm.tanggal"
                  type="date"
                  required
                />
              </div>

              <div class="form-group col-2">
                <label>Nominal Pencairan (Rp) <span class="req">*</span></label>
                <input
                  v-model.number="paymentForm.jumlah"
                  type="number"
                  min="1"
                  placeholder="Contoh: 250000000"
                  required
                />
              </div>

              <div class="form-group col-2">
                <label>Persentase Terhadap Kontrak (%) <span class="req">*</span></label>
                <input
                  v-model.number="paymentForm.persen_kontrak"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  placeholder="Contoh: 25.0"
                  required
                />
              </div>

              <div class="form-actions col-full">
                <button type="button" class="btn-cancel" :disabled="submitting" @click="cancelPaymentForm">
                  Batal
                </button>
                <button type="submit" class="btn-save" :disabled="submitting">
                  <svg v-if="!submitting" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{{ submitting ? 'Menyimpan…' : 'Simpan Pembayaran' }}</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Loading Pembayaran -->
          <div v-if="loadingPayments" class="table-loading">
            <SkeletonBlock height="36px" width="100%" radius="4px" />
            <SkeletonBlock height="36px" width="100%" radius="4px" />
          </div>

          <!-- Empty Pembayaran -->
          <div v-else-if="payments.length === 0 && !showPaymentForm" class="empty-state">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20M7 15h2" />
            </svg>
            <p class="empty-title">Belum ada termin pembayaran dicatat</p>
            <p class="empty-desc">Klik tombol "Tambah Termin" untuk mencatat pencairan termin SP2D.</p>
          </div>

          <!-- Tabel Pembayaran -->
          <div v-else-if="!showPaymentForm" class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">TERMIN</th>
                  <th scope="col">TANGGAL PENCAIRAN</th>
                  <th scope="col">JUMLAH PENCAIRAN</th>
                  <th scope="col">BOBOT KONTRAK</th>
                  <th scope="col" class="th-actions">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in payments" :key="p.id">
                  <td>
                    <span class="badge-termin">Termin {{ p.termin_ke || '—' }}</span>
                  </td>
                  <td>
                    {{ formatDate(p.tanggal) }}
                  </td>
                  <td>
                    <strong class="val-mono">{{ formatCurrency(p.jumlah) }}</strong>
                  </td>
                  <td>
                    <span class="val-mono">{{ p.persen_kontrak }}%</span>
                  </td>
                  <td class="td-actions">
                    <button class="action-btn is-edit" title="Ubah termin" @click="openEditPaymentForm(p)">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button class="action-btn is-delete" title="Hapus termin" @click="confirmDeletePayment(p)">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- TAB 3: PROGRES FISIK                         -->
        <!-- ============================================== -->
        <div v-if="activeTab === 'progress'" class="tab-pane">
          <div class="section-head">
            <div>
              <h4 class="section-title">Progres Fisik Lapangan</h4>
              <p class="section-desc">Hasil pengukuran verifikator/investigasi untuk menghitung selisih cair vs fisik (D4-01).</p>
            </div>
            <button
              v-if="!showProgressForm"
              class="btn-primary-action"
              @click="openAddProgressForm"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Tambah Progres</span>
            </button>
          </div>

          <!-- Subform Tambah/Edit Progres -->
          <div v-if="showProgressForm" class="subform-card">
            <h5 class="subform-title">{{ editingProgressId ? 'Ubah Catatan Progres' : 'Tambah Catatan Progres Baru' }}</h5>
            <form class="grid-form" @submit.prevent="saveProgress">
              <div class="form-group col-2">
                <label>Tanggal Pengukuran / Lapangan <span class="req">*</span></label>
                <input
                  v-model="progressForm.tanggal"
                  type="date"
                  required
                />
              </div>

              <div class="form-group col-2">
                <label>Persentase Fisik Nyata (%) <span class="req">*</span></label>
                <input
                  v-model.number="progressForm.persen_fisik"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Contoh: 35.5"
                  required
                />
              </div>

              <div class="form-actions col-full">
                <button type="button" class="btn-cancel" :disabled="submitting" @click="cancelProgressForm">
                  Batal
                </button>
                <button type="submit" class="btn-save" :disabled="submitting">
                  <svg v-if="!submitting" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{{ submitting ? 'Menyimpan…' : 'Simpan Progres' }}</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Loading Progres -->
          <div v-if="loadingProgress" class="table-loading">
            <SkeletonBlock height="36px" width="100%" radius="4px" />
            <SkeletonBlock height="36px" width="100%" radius="4px" />
          </div>

          <!-- Empty Progres -->
          <div v-else-if="progressList.length === 0 && !showProgressForm" class="empty-state">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
              <path d="M3 3v18h18M7 15l4-4 4 4 6-6" />
            </svg>
            <p class="empty-title">Belum ada catatan progres fisik</p>
            <p class="empty-desc">Klik tombol "Tambah Progres" untuk memasukkan catatan persentase fisik lapangan.</p>
          </div>

          <!-- Tabel Progres -->
          <div v-else-if="!showProgressForm" class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">TANGGAL PENGUKURAN</th>
                  <th scope="col">PROGRES FISIK</th>
                  <th scope="col">SUMBER CATATAN</th>
                  <th scope="col" class="th-actions">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in progressList" :key="item.id">
                  <td>
                    <strong>{{ formatDate(item.tanggal) }}</strong>
                  </td>
                  <td>
                    <span class="badge-progress">{{ item.persen_fisik }}%</span>
                  </td>
                  <td>
                    <span class="sumber-pill">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" class="sumber-icon">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{{ item.sumber || 'verifikator' }}</span>
                    </span>
                  </td>
                  <td class="td-actions">
                    <button class="action-btn is-edit" title="Ubah progres" @click="openEditProgressForm(item)">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button class="action-btn is-delete" title="Hapus progres" @click="confirmDeleteProgress(item)">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Foot -->
      <div class="modal-foot">
        <div class="foot-hint">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>Setiap mutasi item anggaran, termin, atau progres otomatis memicu hitung ulang skor risiko proyek.</span>
        </div>
        <button class="btn-close-foot" @click="close">
          Selesai &amp; Tutup
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { adminProjectsApi } from '@/services/api/admin-projects.api'
import { formatCurrency, formatDate } from '@/utils/formatters'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  project: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const activeTab = ref('rab') // 'rab' | 'payments' | 'progress'

// State
const rabItems = ref([])
const payments = ref([])
const financialSummary = ref(null)
const progressList = ref([])

const loadingRab = ref(false)
const loadingPayments = ref(false)
const loadingProgress = ref(false)
const submitting = ref(false)

const errorMsg = ref('')
const successMsg = ref('')

// RAB Form State
const showRabForm = ref(false)
const editingRabId = ref(null)
const rabForm = ref({
  uraian: '',
  satuan: '',
  volume: null,
  harga_satuan: null,
  kode_harga_acuan: '',
})

// Payment Form State
const showPaymentForm = ref(false)
const editingPaymentId = ref(null)
const paymentForm = ref({
  termin_ke: 1,
  tanggal: '',
  jumlah: null,
  persen_kontrak: null,
})

// Progress Form State
const showProgressForm = ref(false)
const editingProgressId = ref(null)
const progressForm = ref({
  tanggal: '',
  persen_fisik: null,
})

function close() {
  emit('update:modelValue', false)
}

// ==========================================
// LOAD DATA
// ==========================================
async function fetchRabItems() {
  if (!props.project?.id) return
  loadingRab.value = true
  try {
    rabItems.value = await adminProjectsApi.getRabItems(props.project.id)
  } catch (err) {
    console.error('Gagal memuat item RAB:', err)
  } finally {
    loadingRab.value = false
  }
}

async function fetchPayments() {
  if (!props.project?.id) return
  loadingPayments.value = true
  try {
    const res = await adminProjectsApi.getPayments(props.project.id)
    payments.value = res.pembayaran
    financialSummary.value = res.ringkasan
  } catch (err) {
    console.error('Gagal memuat pembayaran:', err)
  } finally {
    loadingPayments.value = false
  }
}

async function fetchProgress() {
  if (!props.project?.id) return
  loadingProgress.value = true
  try {
    progressList.value = await adminProjectsApi.getProgress(props.project.id)
  } catch (err) {
    console.error('Gagal memuat progres:', err)
  } finally {
    loadingProgress.value = false
  }
}

function loadAllData() {
  errorMsg.value = ''
  successMsg.value = ''
  cancelRabForm()
  cancelPaymentForm()
  cancelProgressForm()
  fetchRabItems()
  fetchPayments()
  fetchProgress()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.project) {
      loadAllData()
    }
  },
)

// ==========================================
// RAB ACTIONS
// ==========================================
function openAddRabForm() {
  editingRabId.value = null
  rabForm.value = {
    uraian: '',
    satuan: '',
    volume: null,
    harga_satuan: null,
    kode_harga_acuan: '',
  }
  showRabForm.value = true
}

function openEditRabForm(item) {
  editingRabId.value = item.id
  rabForm.value = {
    uraian: item.uraian || '',
    satuan: item.satuan || '',
    volume: Number(item.volume) || null,
    harga_satuan: Number(item.harga_satuan) || null,
    kode_harga_acuan: item.kode_harga_acuan || '',
  }
  showRabForm.value = true
}

function cancelRabForm() {
  showRabForm.value = false
  editingRabId.value = null
}

async function saveRabItem() {
  errorMsg.value = ''
  successMsg.value = ''
  submitting.value = true

  const payload = {
    uraian: rabForm.value.uraian.trim(),
    satuan: rabForm.value.satuan.trim(),
    volume: Number(rabForm.value.volume),
    harga_satuan: Number(rabForm.value.harga_satuan),
    kode_harga_acuan: rabForm.value.kode_harga_acuan?.trim() || null,
  }

  try {
    let res
    if (editingRabId.value) {
      res = await adminProjectsApi.updateRabItem(editingRabId.value, payload)
      successMsg.value = `Item RAB berhasil diperbarui. Skor risiko terhitung: ${res?.scoring?.skor_total ?? '—'}.`
    } else {
      res = await adminProjectsApi.createRabItem(props.project.id, payload)
      successMsg.value = `Item RAB berhasil ditambahkan. Skor risiko terhitung: ${res?.scoring?.skor_total ?? '—'}.`
    }
    cancelRabForm()
    fetchRabItems()
    emit('saved', res)
  } catch (err) {
    errorMsg.value = err.message || 'Gagal menyimpan item RAB'
  } finally {
    submitting.value = false
  }
}

async function confirmDeleteRab(item) {
  if (!confirm(`Hapus item RAB "${item.uraian}"?`)) return
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const res = await adminProjectsApi.deleteRabItem(item.id)
    successMsg.value = `Item RAB berhasil dihapus. Skor risiko terhitung: ${res?.scoring?.skor_total ?? '—'}.`
    fetchRabItems()
    emit('saved', res)
  } catch (err) {
    errorMsg.value = err.message || 'Gagal menghapus item RAB'
  }
}

// ==========================================
// PAYMENT ACTIONS
// ==========================================
function openAddPaymentForm() {
  editingPaymentId.value = null
  const nextTermin = (payments.value.length || 0) + 1
  paymentForm.value = {
    termin_ke: nextTermin,
    tanggal: new Date().toISOString().slice(0, 10),
    jumlah: null,
    persen_kontrak: null,
  }
  showPaymentForm.value = true
}

function openEditPaymentForm(p) {
  editingPaymentId.value = p.id
  paymentForm.value = {
    termin_ke: Number(p.termin_ke) || 1,
    tanggal: p.tanggal ? new Date(p.tanggal).toISOString().slice(0, 10) : '',
    jumlah: Number(p.jumlah) || null,
    persen_kontrak: Number(p.persen_kontrak) || null,
  }
  showPaymentForm.value = true
}

function cancelPaymentForm() {
  showPaymentForm.value = false
  editingPaymentId.value = null
}

async function savePayment() {
  errorMsg.value = ''
  successMsg.value = ''
  submitting.value = true

  const payload = {
    termin_ke: Number(paymentForm.value.termin_ke),
    tanggal: paymentForm.value.tanggal,
    jumlah: Number(paymentForm.value.jumlah),
    persen_kontrak: Number(paymentForm.value.persen_kontrak),
  }

  try {
    let res
    if (editingPaymentId.value) {
      res = await adminProjectsApi.updatePayment(editingPaymentId.value, payload)
      successMsg.value = `Termin pembayaran berhasil diperbarui. Skor risiko terhitung: ${res?.scoring?.skor_total ?? '—'}.`
    } else {
      res = await adminProjectsApi.createPayment(props.project.id, payload)
      successMsg.value = `Termin pembayaran berhasil ditambahkan. Skor risiko terhitung: ${res?.scoring?.skor_total ?? '—'}.`
    }
    cancelPaymentForm()
    fetchPayments()
    emit('saved', res)
  } catch (err) {
    errorMsg.value = err.message || 'Gagal menyimpan pembayaran'
  } finally {
    submitting.value = false
  }
}

async function confirmDeletePayment(p) {
  if (!confirm(`Hapus pencairan Termin ${p.termin_ke}?`)) return
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const res = await adminProjectsApi.deletePayment(p.id)
    successMsg.value = `Termin pembayaran berhasil dihapus. Skor risiko terhitung: ${res?.scoring?.skor_total ?? '—'}.`
    fetchPayments()
    emit('saved', res)
  } catch (err) {
    errorMsg.value = err.message || 'Gagal menghapus pembayaran'
  }
}

// ==========================================
// PROGRESS ACTIONS
// ==========================================
function openAddProgressForm() {
  editingProgressId.value = null
  progressForm.value = {
    tanggal: new Date().toISOString().slice(0, 10),
    persen_fisik: null,
  }
  showProgressForm.value = true
}

function openEditProgressForm(item) {
  editingProgressId.value = item.id
  progressForm.value = {
    tanggal: item.tanggal ? new Date(item.tanggal).toISOString().slice(0, 10) : '',
    persen_fisik: Number(item.persen_fisik) || 0,
  }
  showProgressForm.value = true
}

function cancelProgressForm() {
  showProgressForm.value = false
  editingProgressId.value = null
}

async function saveProgress() {
  errorMsg.value = ''
  successMsg.value = ''
  submitting.value = true

  const payload = {
    tanggal: progressForm.value.tanggal,
    persen_fisik: Number(progressForm.value.persen_fisik),
  }

  try {
    let res
    if (editingProgressId.value) {
      res = await adminProjectsApi.updateProgress(editingProgressId.value, payload)
      successMsg.value = `Progres fisik berhasil diperbarui. Skor risiko terhitung: ${res?.scoring?.skor_total ?? '—'}.`
    } else {
      res = await adminProjectsApi.createProgress(props.project.id, payload)
      successMsg.value = `Catatan progres fisik berhasil ditambahkan. Skor risiko terhitung: ${res?.scoring?.skor_total ?? '—'}.`
    }
    cancelProgressForm()
    fetchProgress()
    emit('saved', res)
  } catch (err) {
    errorMsg.value = err.message || 'Gagal menyimpan progres'
  } finally {
    submitting.value = false
  }
}

async function confirmDeleteProgress(item) {
  if (!confirm(`Hapus catatan progres ${item.persen_fisik}%?`)) return
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const res = await adminProjectsApi.deleteProgress(item.id)
    successMsg.value = `Catatan progres berhasil dihapus. Skor risiko terhitung: ${res?.scoring?.skor_total ?? '—'}.`
    fetchProgress()
    emit('saved', res)
  } catch (err) {
    errorMsg.value = err.message || 'Gagal menghapus progres'
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-xl);
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-head {
  padding: 18px 24px;
  border-bottom: 1px solid var(--c-border);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  background: var(--c-surface);
}

.badge-exec {
  display: inline-block;
  font-size: var(--fs-micro);
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--c-primary);
  background: var(--c-primary-soft);
  border-radius: var(--r-xs);
  padding: 2px 8px;
  margin-bottom: 4px;
}

.modal-title {
  margin: 0 0 4px 0;
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-ink);
}

.modal-sub {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--c-muted);
}

.btn-close {
  background: none;
  border: none;
  color: var(--c-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--r-md);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-close:hover {
  background: var(--c-bg);
  color: var(--c-ink);
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  background: var(--c-bg);
  border-bottom: 1px solid var(--c-border);
  padding: 0 16px;
  gap: 8px;
}
.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.tab-btn:hover {
  color: var(--c-ink);
}
.tab-btn.is-active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
}
.tab-icon {
  flex: none;
}

/* Modal Body */
.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Alerts */
.alert-box {
  padding: 12px 16px;
  border-radius: var(--r-md);
  font-size: var(--fs-xs);
  display: flex;
  align-items: center;
  gap: 10px;
}
.alert-icon {
  flex: none;
}
.alert-box--danger {
  background: var(--c-danger-soft);
  color: var(--c-danger);
  border: 1px solid rgba(214, 58, 31, 0.2);
}
.alert-box--success {
  background: var(--c-success-soft);
  color: var(--c-success);
  border: 1px solid rgba(22, 163, 74, 0.2);
}

/* Section Head */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.section-title {
  margin: 0 0 2px 0;
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-ink);
}
.section-desc {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--c-muted);
}

.btn-primary-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--c-primary);
  color: white;
  border: none;
  border-radius: var(--r-md);
  font-size: var(--fs-xs);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.btn-primary-action:hover {
  filter: brightness(1.1);
}

/* KPI Mini Grid */
.kpi-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}
.kpi-mini-card {
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kpi-mini-label {
  font-size: var(--fs-micro);
  font-weight: 600;
  color: var(--c-muted);
  text-transform: uppercase;
}
.kpi-mini-val {
  font-size: var(--fs-sm);
  color: var(--c-ink);
}

/* Subform Card */
.subform-card {
  background: var(--c-bg);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-lg);
  padding: 16px 20px;
  margin-bottom: 16px;
}
.subform-title {
  margin: 0 0 14px 0;
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-ink);
}
.grid-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 16px;
}
.col-full {
  grid-column: span 2;
}
.form-group label {
  display: block;
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-ink);
  margin-bottom: 4px;
}
.form-group .req {
  color: var(--c-danger);
}
.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-md);
  font-size: var(--fs-xs);
  background: var(--c-surface);
  color: var(--c-ink);
}
.form-group input:focus {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px var(--c-primary-soft);
}
.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}
.btn-cancel {
  padding: 8px 14px;
  background: none;
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-md);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-muted);
  cursor: pointer;
}
.btn-cancel:hover {
  background: var(--c-surface);
  color: var(--c-ink);
}
.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--c-primary);
  color: white;
  border: none;
  border-radius: var(--r-md);
  font-size: var(--fs-xs);
  font-weight: 600;
  cursor: pointer;
}
.btn-save:hover:not(:disabled) {
  filter: brightness(1.1);
}
.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Data Table */
.data-table-wrap {
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-xs);
}
.data-table th {
  background: var(--c-bg);
  color: var(--c-muted);
  font-size: var(--fs-micro);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--c-border);
}
.data-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--c-border);
  color: var(--c-ink);
}
.data-table tr:last-child td {
  border-bottom: none;
}
.val-mono {
  font-family: monospace;
}
.row-title {
  font-weight: 600;
}
.acuan-info {
  display: flex;
  align-items: center;
  gap: 6px;
}
.acuan-code {
  font-family: monospace;
  font-size: var(--fs-micro);
  color: var(--c-muted);
}
.deviasi-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--r-full);
}
.deviasi-pill.is-danger {
  background: var(--c-danger-soft);
  color: var(--c-danger);
}
.deviasi-pill.is-success {
  background: var(--c-success-soft);
  color: var(--c-success);
}
.badge-termin {
  display: inline-block;
  font-weight: 700;
  font-size: var(--fs-micro);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  padding: 2px 8px;
  border-radius: var(--r-xs);
}
.badge-progress {
  font-weight: 700;
  font-family: monospace;
  font-size: var(--fs-xs);
  color: var(--c-primary);
  background: var(--c-primary-soft);
  padding: 2px 8px;
  border-radius: var(--r-full);
}
.sumber-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-micro);
  color: var(--c-muted);
}
.sumber-icon {
  color: var(--c-success);
}
.th-actions, .td-actions {
  text-align: right;
  white-space: nowrap;
}
.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: var(--r-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}
.action-btn.is-edit {
  color: var(--c-primary);
}
.action-btn.is-edit:hover {
  background: var(--c-primary-soft);
}
.action-btn.is-delete {
  color: var(--c-danger);
}
.action-btn.is-delete:hover {
  background: var(--c-danger-soft);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 36px 20px;
  background: var(--c-bg);
  border: 1px dashed var(--c-border-strong);
  border-radius: var(--r-md);
}
.empty-icon {
  color: var(--c-muted);
  margin-bottom: 8px;
}
.empty-title {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-ink);
  margin: 0 0 4px 0;
}
.empty-desc {
  font-size: var(--fs-xs);
  color: var(--c-muted);
  margin: 0;
}

/* Modal Foot */
.modal-foot {
  padding: 14px 24px;
  border-top: 1px solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--c-bg);
}
.foot-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-micro);
  color: var(--c-muted);
}
.btn-close-foot {
  padding: 8px 18px;
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-md);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-ink);
  cursor: pointer;
}
.btn-close-foot:hover {
  background: var(--c-border);
}
</style>
