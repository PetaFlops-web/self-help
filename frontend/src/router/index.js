import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
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
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
