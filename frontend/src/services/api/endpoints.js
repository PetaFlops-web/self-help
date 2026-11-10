// Sesuaikan semua path ini dengan route backend yang sebenarnya.
// Sumber kebenaran: 26 operasi backend terdaftar di ../backend/src/app.ts
export const endpoints = {
  // --- Publik ---
  projects: '/projects',
  project: (id) => `/projects/${encodeURIComponent(id)}`,
  projectIndicators: (id) => `/projects/${encodeURIComponent(id)}/indicators`,
  projectExplain: (id) => `/projects/${encodeURIComponent(id)}/explain`,
  projectDraft: (id) => `/projects/${encodeURIComponent(id)}/draft`,
  projectProgress: (id) => `/projects/${encodeURIComponent(id)}/progress`,
  projectPayments: (id) => `/projects/${encodeURIComponent(id)}/payments`,
  projectRabItems: (id) => `/projects/${encodeURIComponent(id)}/rab-items`,
  projectDocuments: (id) => `/projects/${encodeURIComponent(id)}/documents`,
  projectProcedureChecklist: (id) => `/projects/${encodeURIComponent(id)}/procedure-checklist`,
  projectReports: (id) => `/projects/${encodeURIComponent(id)}/reports`,
  stats: '/stats',
  regions: '/regions',
  sources: '/sources',
  scoringConfig: '/config/scoring',
  reports: '/reports',
  trackReport: (code) => `/reports?tiket=${encodeURIComponent(code)}`,

  // --- Autentikasi (backend Fase 19) ---
  authLogin: '/auth/login',
  authLogout: '/auth/logout',
  authMe: '/auth/me',

  // --- Admin: Laporan (backend Fase 21 & 29) ---
  adminReports: '/admin/reports',
  adminReport: (tiket) => `/admin/reports/${encodeURIComponent(tiket)}`,
  adminReportForward: (tiket) => `/admin/reports/${encodeURIComponent(tiket)}/forward`,
  adminReportsTrend: '/admin/reports/trend',

  // --- Admin: Audit (backend Fase 20) ---
  adminAudit: '/admin/audit',

  // --- Admin: ETL & Pencocokan (backend Fase 22-25) ---
  adminEtlRun: '/admin/etl/run',
  adminEtlImport: '/admin/etl/import',
  adminEtlErrors: '/admin/etl/errors',
  adminEtlUnmatched: '/admin/etl/unmatched',
  adminEtlMatch: '/admin/etl/match',

  // --- Admin: Notifikasi (backend Fase 26) ---
  adminNotifications: '/admin/notifications',
  adminNotificationRetry: (id) => `/admin/notifications/${encodeURIComponent(id)}/retry`,
  adminNotificationRetention: '/admin/notifications/retention',

  // --- Admin: Kelola Proyek & Tender (backend Fase 28 / FR-42, FR-57, FR-58, FR-59) ---
  adminProjects: '/admin/projects',
  adminProject: (id) => `/admin/projects/${encodeURIComponent(id)}`,
  adminProjectTenders: (id) => `/admin/projects/${encodeURIComponent(id)}/tenders`,
  adminTender: (id) => `/admin/tenders/${encodeURIComponent(id)}`,
  adminProjectValueHistory: (id) => `/admin/projects/${encodeURIComponent(id)}/value-history`,

  // --- Admin: Eksekusi Proyek (RAB, Pembayaran, Progres - backend Fase 29) ---
  adminProjectRabItems: (id) => `/admin/projects/${encodeURIComponent(id)}/rab-items`,
  adminRabItem: (id) => `/admin/rab-items/${encodeURIComponent(id)}`,
  adminProjectPayments: (id) => `/admin/projects/${encodeURIComponent(id)}/payments`,
  adminPayment: (id) => `/admin/payments/${encodeURIComponent(id)}`,
  adminProjectProgress: (id) => `/admin/projects/${encodeURIComponent(id)}/progress`,
  adminProgress: (id) => `/admin/progress/${encodeURIComponent(id)}`,
}
