<template>
  <div class="admin-login-page">
    <div class="admin-login-card">
      <RouterLink to="/" class="admin-login-brand">
        <img src="/clearsight-mark-light.svg" alt="Clearsight" class="brand-mark" />
        <span>Clearsight</span>
      </RouterLink>
      <p class="admin-login-subtitle">Panel Pengawas</p>

      <form @submit.prevent="handleSubmit" novalidate>
        <div class="admin-field">
          <label for="surel">Surel</label>
          <input
            id="surel"
            v-model.trim="form.surel"
            type="email"
            placeholder="nama@contoh.go.id"
            :disabled="loading"
            required
            autocomplete="email"
          />
        </div>

        <div class="admin-field">
          <label for="kata-sandi">Kata Sandi</label>
          <input
            id="kata-sandi"
            v-model="form.kata_sandi"
            type="password"
            placeholder="••••••••"
            :disabled="loading"
            required
            autocomplete="current-password"
          />
        </div>

        <p v-if="errorMsg" class="admin-login-error" role="alert">{{ errorMsg }}</p>

        <button type="submit" class="admin-login-btn" :disabled="loading">
          {{ loading ? 'Memproses…' : 'Masuk' }}
        </button>
      </form>

      <RouterLink to="/" class="admin-login-back">← Kembali ke situs publik</RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = ref({ surel: '', kata_sandi: '' })
const loading = computed(() => auth.loading)
const errorMsg = computed(() => auth.error)

async function handleSubmit() {
  // Backend mengembalikan pesan generik — jangan bedakan
  // "surel tidak ditemukan" dan "kata sandi salah".
  try {
    await auth.login(form.value.surel, form.value.kata_sandi)
    const redirect = route.query.redirect
    router.push(typeof redirect === 'string' && redirect.startsWith('/admin') ? redirect : '/admin')
  } catch {
    // Pesan galat sudah di-set di store.auth.error — cukup ditampilkan.
  }
}
</script>
