/**
 * Mock data untuk halaman dashboard (Ringkasan Pemantauan).
 * Berisi data proyek yang dipantau, laporan warga sekitar, dimensi risiko, aliran dana, dan analisis AI.
 *
 * @type {import('@/features/dashboard/types/dashboard').DashboardData}
 */
export const mockDashboardData = {
  project: {
    title: 'Peningkatan Jalan Natar–Merak Batin',
    titleHtml: 'Peningkatan Jalan<br />Natar–<em>Merak Batin</em>',
    meta: 'Dinas PUPR Kabupaten Contoh | Pagu Rp4,2 miliar | PT Contoh Karya (fiktif)',
    tags: ['Proyek jalan', 'Kab. Contoh, TA 2026'],
    budgetLabel: 'Pagu Rp4,2 miliar',
    reportCount: 3,
    // Koordinat simulasi di sekitar Natar, Lampung Selatan.
    lat: -5.2167,
    lng: 105.1833,
    riskScore: 69,
    riskLabel: 'Tinggi',
    riskLevel: 'high',
    disclaimer: 'Data simulasi. Skor adalah indikator risiko untuk diperiksa, bukan bukti pelanggaran.',
  },

  nearbyReports: [
    { code: 'LPR-0142', distance: '120 m dari proyek', status: 'Diverifikasi', level: 'low', lat: -5.2158, lng: 105.184 },
    { code: 'LPR-0139', distance: '340 m dari proyek', status: 'Dilaporkan', level: 'attention', lat: -5.2182, lng: 105.186 },
    { code: 'LPR-0131', distance: '610 m dari proyek', status: 'Diteruskan', level: 'high', lat: -5.2137, lng: 105.1788 },
  ],

  dimensions: [
    { label: 'Anggaran', value: 70 },
    { label: 'Pengadaan', value: 55 },
    { label: 'Pengawasan', value: 70 },
    { label: 'Pembayaran', value: 100 },
    { label: 'Prosedur', value: 40 },
    { label: 'Keterbukaan', value: 20 },
  ],

  indicators: [
    {
      key: 'pay',
      icon: 'Rp',
      title: 'Pembayaran',
      description: 'Uang yang sudah dibayarkan lebih besar dibandingkan pekerjaan yang tercatat selesai sehingga perlu diperiksa kesesuaiannya.',
      meta: 'Selisih 35 poin',
      level: 'high',
      label: 'Tinggi',
    },
    {
      key: 'sup',
      icon: '!',
      title: 'Pengawasan',
      description: 'Jumlah pekerjaan yang tercatat berbeda dari rencana awal sehingga perlu dipastikan kesesuaiannya dengan kondisi sebenarnya.',
      meta: '3 laporan warga',
      level: 'high',
      label: 'Tinggi',
    },
    {
      key: 'rab',
      icon: '%',
      title: 'Rencana biaya proyek',
      description: 'Harga bahan dalam anggaran lebih tinggi daripada harga pembanding sehingga perlu diperiksa alasan perbedaannya.',
      meta: 'Item 4 dari 12',
      level: 'high',
      label: 'Tinggi',
    },
    {
      key: 'pro',
      icon: '1',
      title: 'Pengadaan',
      description: 'Hanya satu perusahaan yang tercatat mengikuti pemilihan pekerjaan sehingga prosesnya perlu diperiksa lebih lanjut.',
      meta: 'Paket P-014',
      level: 'attention',
      label: 'Sedang',
    },
    {
      key: 'doc',
      icon: '✓',
      title: 'Prosedur',
      description: 'Beberapa dokumen proyek belum ditemukan dalam data yang tersedia sehingga perlu dipastikan keberadaannya.',
      meta: 'Addendum 1×',
      level: 'attention',
      label: 'Sedang',
    },
    {
      key: 'open',
      icon: 'i',
      title: 'Keterbukaan',
      description: 'Informasi proyek belum ditemukan pada sumber yang diperiksa sehingga perlu dicek kembali melalui sumber resmi lainnya.',
      meta: 'Diperbarui 12 Okt',
      level: 'low',
      label: 'Rendah',
    },
  ],

  fund: {
    steps: [
      { label: '1. Anggaran daerah', value: 'Rp4,2 miliar' },
      { label: '2. Nilai kontrak', value: 'Rp4,2 miliar' },
      { label: '3. Uang yang sudah dibayarkan', value: 'Rp3,36 miliar (80%)', accent: true },
    ],
    paidPercent: 80,
    paidLabel: 'Sudah dibayarkan: Rp3,36 miliar',
    unpaidLabel: 'Belum dibayarkan: Rp840 juta',
    note: 'Angka ini menunjukkan pembayaran, bukan ukuran pekerjaan yang sudah selesai.',
  },

  stages: [
    { label: 'Pembayaran tahap 1', paid: 30, done: 28 },
    { label: 'Pembayaran tahap 2', paid: 60, done: 40 },
    { label: 'Pembayaran tahap 3', paid: 80, done: 45 },
  ],

  ai: {
    createdAt: 'Dibuat 17 Okt',
    status: 'Analisis selesai',
    steps: [
      { no: '01', title: 'Membaca data', text: '12 rincian biaya, 3 tahap pembayaran, 1 proyek' },
      { no: '02', title: 'Membandingkan', text: 'Dibandingkan dengan harga pembanding' },
      { no: '03', title: 'Menghitung selisih', text: 'Oleh mesin skor (kode), bukan AI' },
      { no: '04', title: 'Menjelaskan', text: 'AI menyusun penjelasan awam', active: true },
    ],
    rows: [
      { item: 'Lapisan aspal jalan (AC-WC)', budget: 'Rp1,52 M', benchmark: 'Rp1,19 M', diff: '+28%', level: 'high', label: 'Tinggi' },
      { item: 'Batu pondasi jalan (agregat kelas A)', budget: 'Rp0,88 M', benchmark: 'Rp0,84 M', diff: '+5%', level: 'low', label: 'Rendah' },
      { item: 'Garis jalan dan rambu', budget: 'Rp0,21 M', benchmark: 'Rp0,18 M', diff: '+17%', level: 'attention', label: 'Sedang' },
      { item: 'Pembayaran tahap 3', budget: '80% dibayar', benchmark: '45% selesai', diff: '+35 poin', level: 'high', label: 'Tinggi' },
    ],
    formulaNote: 'Selisih = (rencana − acuan) ÷ acuan. Rumus dan bobot dihitung berdasarkan acuan standar teknis.',
    validationNote: 'Penjelasan divalidasi terhadap hasil hitung sebelum ditampilkan. Periksa kembali dengan dokumen asli.',
    explanation: [
      'Dari pagu Rp4,2 miliar, AI memeriksa 12 item RAB dan 3 tahap pembayaran. Biaya aspal paling menonjol: harganya sekitar 28% di atas acuan daerah. Karena aspal bernilai paling besar, selisih ini paling memengaruhi total.',
      'Dari sisi pembayaran, dana sudah dicairkan 80% padahal pekerjaan yang tercatat selesai baru 45%. Selisih 35 poin ini yang paling perlu dijelaskan oleh pelaksana proyek.',
      'Perlu dicatat: harga pembanding dan pekerjaan selesai memakai data simulasi, dan hasil ini bukan bukti pelanggaran.',
    ],
    chips: ['Aspal • +28%', 'Pembayaran tahap 3 • +35 poin', 'Dasar data: simulasi'],
  },
}
