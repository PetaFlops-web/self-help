<template>
  <div class="admin-shell">
    <aside class="admin-sidebar" :class="{ 'is-open': sidebarOpen }">
      <div class="admin-sidebar-head">
        <RouterLink to="/admin" class="admin-brand" @click="sidebarOpen = false">
          <img src="/clearsight-mark-light.svg" alt="Clearsight" class="brand-mark" />
          <span>Clearsight</span>
        </RouterLink>
        <span class="admin-sidebar-tag">Panel Pengawas</span>
      </div>

      <nav class="admin-nav" aria-label="Navigasi admin">
        <RouterLink
          v-for="item in visibleMenu"
          :key="item.to"
          :to="item.to"
          class="admin-nav-link"
          @click="sidebarOpen = false"
        >
          {{ item.label }}
        </RouterLink>
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

// Definisi menu sesuai frame desain 01–08.
// Item disembunyikan (bukan dinonaktifkan) bila peran tidak diizinkan.
const menuItems = [
  { to: '/admin', label: 'Ringkasan', roles: ['admin', 'verifikator', 'peninjau'] },
  { to: '/admin/laporan', label: 'Antrean laporan', roles: ['admin', 'verifikator'] },
  { to: '/admin/audit', label: 'Log audit', roles: ['admin', 'peninjau'] },
]

const visibleMenu = computed(() => {
  const peran = auth.user?.peran
  if (!peran) return []
  return menuItems.filter((item) => item.roles.includes(peran))
})

const roleLabel = computed(() => {
  const map = { admin: 'Administrator', verifikator: 'Verifikator', peninjau: 'Peninjau' }
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
</style>
