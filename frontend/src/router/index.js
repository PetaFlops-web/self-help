import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    // ── Admin: Login (standalone, tanpa AdminLayout) ──
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/features/admin/views/AdminLoginView.vue'),
      meta: { title: 'Masuk Panel Admin' },
    },

    // ── Admin: Panel (dengan AdminLayout + guard) ──
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/features/admin/views/AdminDashboardView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'verifikator', 'peninjau'],
            title: 'Ringkasan Operasional',
          },
        },
        {
          path: 'laporan',
          name: 'admin-reports',
          component: () => import('@/features/admin/views/AdminReportsView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'verifikator'],
            title: 'Antrean Verifikasi Laporan Warga',
          },
        },
        {
          path: 'laporan/:tiket',
          name: 'admin-report-detail',
          component: () => import('@/features/admin/views/AdminReportDetailView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'verifikator'],
            title: 'Detail Laporan',
          },
        },
        {
          path: 'proyek',
          name: 'admin-projects',
          component: () => import('@/features/admin/views/AdminProjectsView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'peninjau'],
            title: 'Daftar Proyek Pengawasan',
          },
        },
        {
          path: 'data',
          name: 'admin-data',
          component: () => import('@/features/admin/views/AdminDataView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin'],
            title: 'Manajemen Data & Pipa ETL',
          },
        },
        {
          path: 'ai',
          name: 'admin-ai',
          component: () => import('@/features/admin/views/AdminAiView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin'],
            title: 'Pemantauan Model AI & Guardrails',
          },
        },
        {
          path: 'audit',
          name: 'admin-audit',
          component: () => import('@/features/admin/views/AdminAuditView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'peninjau'],
            title: 'Log Audit',
          },
        },
        {
          path: 'notifikasi',
          name: 'admin-notifications',
          component: () => import('@/features/admin/views/AdminNotificationsView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'peninjau'],
            title: 'Log & Retensi Notifikasi Surel',
          },
        },
        {
          path: 'forbidden',
          name: 'admin-forbidden',
          component: () => import('@/features/admin/views/AdminForbiddenView.vue'),
          meta: { requiresAuth: true, title: 'Akses Ditolak' },
        },
        // Rute admin tak dikenal → kembali ke Ringkasan
        { path: ':pathMatch(.*)*', redirect: '/admin' },
      ],
    },

    // ── Publik (sisi warga) ──
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/features/dashboard/views/DashboardView.vue'),
          meta: { title: 'Ringkasan Pemantauan', hideHeader: true },
        },
        { path: 'proyek', redirect: '/' },
        {
          path: 'proyek/:id',
          name: 'project-detail',
          component: () => import('@/features/projects/views/ProjectDetailView.vue'),
          meta: { title: 'Profil Proyek' },
        },
        {
          path: 'lapor',
          name: 'citizen-report',
          component: () => import('@/features/citizen-reports/views/CitizenReportView.vue'),
          meta: { title: 'Lapor Warga' },
        },
        {
          path: 'lacak-laporan',
          name: 'report-tracking',
          component: () => import('@/features/report-tracking/views/ReportTrackingView.vue'),
          meta: { title: 'Lacak Laporan' },
        },
      ],
    },

    // Catch-all: semua path tak dikenal → beranda publik
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// ── Navigation guard ──────────────────────────────────────────────────
// Rute publik tetap dapat diakses tanpa login. Guard hanya aktif untuk /admin/*.
router.beforeEach(async (to) => {
  // Halaman login: bila sudah terautentikasi, alihkan ke dashboard.
  if (to.name === 'admin-login') {
    const auth = useAuthStore()
    await auth.initialize()
    if (auth.isAuthenticated) {
      return { name: 'admin-dashboard' }
    }
    return true
  }

  // Rute tanpa meta.requiresAuth → publik, lewatkan tanpa cek.
  if (to.meta.requiresAuth !== true) return true

  // Rute admin yang memerlukan autentikasi.
  const auth = useAuthStore()
  await auth.initialize()

  if (!auth.isAuthenticated) {
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }

  // Periksa peran bila didefinisikan di meta.roles.
  if (to.meta.roles?.length && !to.meta.roles.includes(auth.user?.peran)) {
    return { name: 'admin-forbidden' }
  }

  return true
})

export default router
