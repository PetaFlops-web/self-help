<template>
  <div class="admin-shell">
    <aside class="admin-sidebar" :class="{ 'is-open': sidebarOpen }">
      <div class="admin-sidebar-head">
        <RouterLink to="/admin" class="admin-brand" @click="sidebarOpen = false">
          <span>Clearsight</span>
        </RouterLink>
        <span class="admin-sidebar-tag">Panel Pengawas v1.1</span>
      </div>

      <nav class="admin-nav" aria-label="Navigasi admin">
        <template v-for="cat in visibleCategories" :key="cat.category">
          <p class="admin-nav-cat">{{ cat.category }}</p>
          <component
            :is="item.to ? RouterLink : 'span'"
            v-for="item in cat.items"
            :key="item.label"
            :to="item.to || undefined"
            class="admin-nav-link"
            :class="{ 'admin-nav-soon': !item.to }"
            @click="item.to && (sidebarOpen = false)"
          >
            <svg
              class="admin-nav-icon"
              viewBox="0 0 14 14"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path :d="item.icon" />
            </svg>
            <span class="admin-nav-text">{{ item.label }}</span>
            <span v-if="!item.to" class="admin-nav-badge">segera</span>
          </component>
        </template>
      </nav>

      <div class="admin-sidebar-foot">
        <div class="admin-profile">
          <span class="admin-avatar" aria-hidden="true">{{ initials }}</span>
          <div class="admin-profile-info">
            <span class="admin-profile-name">{{ auth.user?.nama || '—' }}</span>
            <span class="admin-profile-role">{{ roleLabel }}</span>
          </div>
        </div>
        <button class="admin-logout-btn" :disabled="loggingOut" @click="handleLogout">
          {{ loggingOut ? 'Memproses…' : 'Keluar' }}
        </button>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <button
          class="admin-sidebar-toggle"
          :aria-expanded="sidebarOpen"
          aria-label="Buka menu"
          @click="sidebarOpen = !sidebarOpen"
        >
          <span /><span /><span />
        </button>
        <h1 class="admin-page-title">{{ pageTitle }}</h1>
      </header>

      <main class="admin-content">
        <RouterView v-slot="{ Component }">
          <Suspense>
            <component :is="Component" />
            <template #fallback>
              <p class="admin-fallback">Memuat…</p>
            </template>
          </Suspense>
        </RouterView>
      </main>
    </div>

    <div v-if="sidebarOpen" class="admin-sidebar-overlay" @click="sidebarOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const sidebarOpen = ref(false)
const loggingOut = ref(false)

// Definisi menu sesuai frame desain 01–08 (ui_ux_clearsight.figcraft).
// Ikon diekstrak langsung dari node VECTOR di berkas desain (14×14, stroke 1.5).
// Item tanpa `to` adalah fase F6 (belum punya endpoint) — tampil dengan badge "segera".
// Item disembunyikan (bukan dinonaktifkan) bila peran tidak diizinkan.
const menuConfig = [
  {
    category: 'MAIN',
    items: [
      {
        to: '/admin',
        label: 'Ringkasan',
        roles: ['admin', 'verifikator', 'peninjau'],
        icon: 'M1.2 1.2h4.2v4.2h-4.2zM8.6 1.2h4.2v4.2h-4.2zM1.2 8.6h4.2v4.2h-4.2zM8.6 8.6h4.2v4.2h-4.2z',
      },
      {
        to: '/admin/laporan',
        label: 'Laporan Warga',
        roles: ['admin', 'verifikator'],
        icon: 'M8.56.64v3.82h4.66M4.67 7h6.22M4.67 9.55h4.66M1.56 0h7.77L14 3.82v8.9c0 .71-.7 1.28-1.56 1.28H1.56C.7 14 0 13.43 0 12.73V1.27C0 .57.7 0 1.56 0Z',
      },
      {
        to: '/admin/proyek',
        label: 'Daftar Proyek',
        roles: ['admin', 'peninjau'],
        icon: 'M0 10.5L7 14l7-3.5M0 7l7 3.5L14 7M7 0L0 3.5L7 7l7-3.5L7 0Z',
      },
    ],
  },
  {
    category: 'PENGAWASAN',
    items: [
      {
        to: '/admin/data',
        label: 'Data & ETL',
        roles: ['admin'],
        icon: 'M14 7c0-3.87-3.13-7-7-7C5.04.01 3.17.77 1.76 2.13L0 3.89M0 0v3.89h3.89M0 7c0 3.87 3.13 7 7 7c1.96-.01 3.83-.77 5.24-2.13L14 10.11M14 14v-3.89h-3.89',
      },
      {
        to: '/admin/ai',
        label: 'AI (LLM)',
        roles: ['admin'],
        icon: 'M7 0v2.8M7 11.2V14M2.05 2.05l1.98 1.98M9.97 9.97l1.98 1.98M0 7h2.8M11.2 7H14M2.05 11.95l1.98-1.98M9.97 4.03l1.98-1.98',
      },
    ],
  },
  {
    category: 'SISTEM',
    items: [
      {
        to: '/admin/audit',
        label: 'Log Audit',
        roles: ['admin', 'peninjau'],
        icon: 'M7 14S14 11.2 14 7V2.1L7 0 0 2.1V7c0 4.2 7 7 7 7Z',
      },
      {
        to: '/admin/notifikasi',
        label: 'Notifikasi Surel',
        roles: ['admin', 'peninjau'],
        icon: 'M1.5 3h11a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-6.5a1 1 0 0 1 1-1ZM1.5 4.2l5.5 3.8 5.5-3.8',
      },
      {
        label: 'Pengguna & Peran',
        roles: ['admin'],
        icon: 'M10.18 14v-1.56c0-1.71-1.14-3.11-2.55-3.11H2.55C1.14 9.33 0 10.73 0 12.44V14M14 14v-1.56c0-1.41-.79-2.65-1.91-3.01M9.55.1c1.12.35 1.91 1.6 1.91 3.01 0 1.42-.79 2.66-1.91 3.02M5.09 6.22c1.41 0 2.55-1.39 2.55-3.11S6.5 0 5.09 0 2.55 1.39 2.55 3.11s1.14 3.11 2.55 3.11Z',
      },
    ],
  },
]

const visibleCategories = computed(() => {
  const peran = auth.user?.peran
  if (!peran) return []
  return menuConfig
    .map((cat) => ({
      category: cat.category,
      items: cat.items.filter((item) => item.roles.includes(peran)),
    }))
    .filter((cat) => cat.items.length > 0)
})

const roleLabel = computed(() => {
  const map = { admin: 'Administrator Sistem', verifikator: 'Verifikator', peninjau: 'Peninjau' }
  return map[auth.user?.peran] || auth.user?.peran || ''
})

const initials = computed(() => {
  const nama = auth.user?.nama
  if (!nama) return '?'
  const parts = nama.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
})

const pageTitle = computed(() => route.meta.title || 'Panel Pengawas')

async function handleLogout() {
  loggingOut.value = true
  await auth.logout()
  loggingOut.value = false
  router.push('/admin/login')
}
</script>

<style scoped>
.admin-fallback {
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.admin-profile-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex: 1;
}

.admin-profile-name {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-ink, #111111);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.admin-profile-role {
  display: block;
  font-size: 11px;
  color: var(--c-muted, #6B6760);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}
</style>
