<template>
  <div class="page-bg">
    <header class="site-header">
      <nav class="navbar navbar-expand-md app-nav site-container" aria-label="Navigasi utama">
        <RouterLink class="navbar-brand brand m-0" to="/">
          <img class="brand-mark" src="/clearsight-mark-light.svg" alt="Clearsight" />
          <span>Clearsight</span>
        </RouterLink>

        <div class="cta-wrap order-md-3 d-flex align-items-center gap-2 ms-auto">
          <RouterLink class="btn btn-dark" to="/lapor">Lapor sekarang</RouterLink>
          <button ref="navToggler" class="navbar-toggler d-md-none" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
                  aria-controls="mainNav" aria-expanded="false" aria-label="Buka menu">
            <span class="navbar-toggler-icon" />
          </button>
        </div>

        <div id="mainNav" ref="navMenu" class="collapse navbar-collapse order-md-2 justify-content-md-end">
          <ul class="navbar-nav gap-md-4">
            <li v-for="link in links" :key="link.to" class="nav-item">
              <RouterLink class="nav-link" :to="link.to">{{ link.label }}</RouterLink>
            </li>
          </ul>
        </div>
      </nav>
    </header>

    <main class="site-main site-container">
      <header v-if="!isHome" class="page-head">
        <p class="eyebrow">TRANSPARANSI PUBLIK</p>
        <h1>{{ title }}</h1>
      </header>
      <RouterView v-slot="{ Component }">
        <Suspense>
          <template #default>
            <component :is="Component" />
          </template>
          <template #fallback>
            <div class="page-suspense-fallback py-4" aria-busy="true">
              <span class="visually-hidden" role="status">Memuat…</span>
              <div class="placeholder-glow d-grid gap-3" aria-hidden="true">
                <div class="placeholder col-12 rounded-4" style="height: 180px; background-color: var(--line);" />
                <div class="placeholder col-8 rounded-pill" style="height: 24px; background-color: var(--line);" />
              </div>
            </div>
          </template>
        </Suspense>
      </RouterView>
    </main>

    <footer class="site-footer">
      <div class="site-container app-footer text-center">
        <span>Indikator risiko bukan bukti pelanggaran. Data pada tahap pengembangan adalah simulasi.</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()

const links = [
  { to: '/', label: 'Peta proyek' },
  { to: '/lapor', label: 'Lapor warga' },
  { to: '/lacak-laporan', label: 'Lacak laporan' },
]

const title = computed(() => route.meta.title || 'Clearsight')
const isHome = computed(() => Boolean(route.meta.hideHeader))

// Menu mobile otomatis menutup setelah berpindah halaman
const navMenu = ref(null)
const navToggler = ref(null)
watch(() => route.fullPath, () => {
  if (navMenu.value?.classList.contains('show')) navToggler.value?.click()
})
</script>
