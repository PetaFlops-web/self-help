const swaggerSpec = {
    openapi: '3.0.3',
    info: {
        title: 'WIA Self-Help Backend API',
        version: '1.0.0',
        description: 'API dokumentasi untuk backend WIA (Warga Indonesia Anti-korupsi). ' +
            'Menyediakan data proyek infrastruktur, indikator risiko, ' +
            'penjelasan LLM, dan sumber data publik.',
    },
    servers: [
        {
            url: '/api',
            description: 'Base path semua endpoint publik',
        },
    ],
    tags: [
        { name: 'Health', description: 'Cek kesehatan server, database, dan Redis' },
        { name: 'Regions', description: 'Data wilayah (kabupaten/kota)' },
        { name: 'Projects', description: 'Data proyek infrastruktur beserta indikator' },
        { name: 'Stats', description: 'Statistik ringkasan beranda' },
        { name: 'Sources', description: 'Daftar sumber data publik' },
        { name: 'Config', description: 'Konfigurasi scoring aktif' },
        { name: 'LLM', description: 'Penjelasan dan draf laporan berbasis LLM' },
        { name: 'Financials', description: 'Data pembayaran, progres, dan RAB proyek' },
        { name: 'Reports', description: 'Pelaporan warga' },
        { name: 'Admin', description: 'Panel admin untuk verifikasi laporan' },
        { name: 'Documents', description: 'Document wajib publik dan checklist prosedur proyek' },
    ],
    paths: {
        '/ping': {
            get: {
                tags: ['Health'],
                summary: 'Health check',
                description: 'Mengecek koneksi ke database PostgreSQL dan Redis.',
                operationId: 'getPing',
                responses: {
                    '200': {
                        description: 'Server aktif',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/PingResponse' },
                            },
                        },
                    },
                    '500': {
                        description: 'Koneksi database atau Redis gagal',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/regions': {
            get: {
                tags: ['Regions'],
                summary: 'Daftar wilayah (GeoJSON)',
                description: 'Mengembalikan semua wilayah dalam format GeoJSON FeatureCollection. ' +
                    'Setiap feature memiliki properties kode_bps, nama, lat, lng.',
                operationId: 'getRegions',
                responses: {
                    '200': {
                        description: 'GeoJSON FeatureCollection wilayah',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/RegionsResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/projects': {
            get: {
                tags: ['Projects'],
                summary: 'Daftar proyek',
                description: 'Mengembalikan daftar proyek infrastruktur. Mendukung filter berdasarkan ' +
                    'kode_bps, dinas, kategori, tahun_anggaran, limit, pencarian teks (q), ' +
                    'dan range nilai (pagu_min, pagu_max, nilai_kontrak_min, nilai_kontrak_max).',
                operationId: 'listProjects',
                parameters: [
                    {
                        name: 'kode_bps',
                        in: 'query',
                        description: 'Filter berdasarkan kode BPS wilayah',
                        schema: { type: 'string' },
                    },
                    {
                        name: 'dinas',
                        in: 'query',
                        description: 'Filter berdasarkan nama dinas',
                        schema: { type: 'string' },
                    },
                    {
                        name: 'kategori',
                        in: 'query',
                        description: 'Filter berdasarkan kategori risiko',
                        schema: { type: 'string', enum: ['Rendah', 'Perlu Perhatian', 'Tinggi'] },
                    },
                    {
                        name: 'tahun_anggaran',
                        in: 'query',
                        description: 'Filter berdasarkan tahun anggaran',
                        schema: { type: 'integer' },
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        description: 'Batas jumlah hasil (default: semua)',
                        schema: { type: 'integer', minimum: 1 },
                    },
                    {
                        name: 'q',
                        in: 'query',
                        description: 'Pencarian teks pada nama proyek dan dinas (ILIKE)',
                        schema: { type: 'string' },
                    },
                    {
                        name: 'pagu_min',
                        in: 'query',
                        description: 'Filter pagu minimal (inklusif)',
                        schema: { type: 'number', minimum: 0 },
                    },
                    {
                        name: 'pagu_max',
                        in: 'query',
                        description: 'Filter pagu maksimal (inklusif)',
                        schema: { type: 'number', minimum: 0 },
                    },
                    {
                        name: 'nilai_kontrak_min',
                        in: 'query',
                        description: 'Filter nilai kontrak minimal (inklusif)',
                        schema: { type: 'number', minimum: 0 },
                    },
                    {
                        name: 'nilai_kontrak_max',
                        in: 'query',
                        description: 'Filter nilai kontrak maksimal (inklusif)',
                        schema: { type: 'number', minimum: 0 },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Daftar proyek',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ProjectsListResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}': {
            get: {
                tags: ['Projects'],
                summary: 'Detail proyek',
                description: 'Mengembalikan detail lengkap satu proyek berdasarkan UUID.',
                operationId: 'getProject',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'UUID proyek',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Detail proyek',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ProjectDetailResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Project tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/indicators': {
            get: {
                tags: ['Projects'],
                summary: 'Indikator temuan proyek',
                description: 'Mengembalikan daftar indikator temuan (kode aturan, dimensi, tingkat, nilai) ' +
                    'untuk proyek tertentu.',
                operationId: 'getProjectIndicators',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'UUID proyek',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Daftar indikator temuan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/IndicatorsResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Project tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/payments': {
            get: {
                tags: ['Financials'],
                summary: 'Daftar pembayaran proyek',
                description: 'Mengembalikan rincian termin pembayaran proyek beserta ringkasan ' +
                    'total dibayar dan persentase sisa pembayaran.',
                operationId: 'getProjectPayments',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'UUID proyek',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Daftar pembayaran dan ringkasan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/PaymentsResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'UUID tidak valid',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Project tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/progress': {
            get: {
                tags: ['Financials'],
                summary: 'Daftar progres fisik proyek',
                description: 'Mengembalikan riwayat progres fisik proyek (persentase pekerjaan selesai) ' +
                    'berdasarkan sumber verifikasi.',
                operationId: 'getProjectProgress',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'UUID proyek',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Daftar progres fisik',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ProgressResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'UUID tidak valid',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Project tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/rab-items': {
            get: {
                tags: ['Financials'],
                summary: 'Daftar item RAB proyek',
                description: 'Mengembalikan rincian item RAB (rencana anggaran biaya) proyek, termasuk ' +
                    'perbandingan harga satuan dengan harga acuan.',
                operationId: 'getProjectRabItems',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'UUID proyek',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Daftar item RAB',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/RabItemsResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'UUID tidak valid',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Project tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/documents': {
            get: {
                tags: ['Documents'],
                summary: 'Daftar dokumen wajib publik proyek',
                description: 'Mengembalikan daftar dokumen wajib publik proyek beserta status ' +
                    'apakah dokumen sudah dipublikasikan.',
                operationId: 'getProjectDocuments',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'UUID proyek',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Daftar dokumen proyek',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DocumentsResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'UUID tidak valid',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Project tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/procedure-checklist': {
            get: {
                tags: ['Documents'],
                summary: 'Daftar checklist prosedur proyek',
                description: 'Mengembalikan daftar tahapan prosedur pengadaan proyek beserta status ' +
                    'terpenuhi atau tidak.',
                operationId: 'getProjectProcedureChecklist',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'UUID proyek',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Daftar checklist prosedur proyek',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ProcedureChecklistResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'UUID tidak valid',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Project tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/explain': {
            post: {
                tags: ['LLM'],
                summary: 'Penjelasan proyek (LLM)',
                description: 'Menghasilkan penjelasan risiko proyek dalam bahasa awam menggunakan LLM. ' +
                    'Jika LLM service tidak tersedia, mengembalikan penjelasan cadangan (fallback). ' +
                    'Field generated_by menunjukkan sumber: "llm" atau "fallback".',
                operationId: 'explainProject',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'UUID proyek',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Penjelasan proyek berhasil dibuat',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ExplainResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'UUID tidak valid',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Project tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/projects/{id}/draft': {
            post: {
                tags: ['LLM'],
                summary: 'Draf laporan tindak lanjut (LLM)',
                description: 'Menghasilkan draf surat permohonan klarifikasi kepada lembaga tujuan. ' +
                    'Jika LLM service tidak tersedia, mengembalikan draf cadangan (fallback). ' +
                    'Field generated_by menunjukkan sumber: "llm" atau "fallback".',
                operationId: 'draftProject',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'UUID proyek',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    tujuan: {
                                        type: 'string',
                                        enum: ['inspektorat', 'BPK', 'KPK', 'Ombudsman', 'dinas_terkait'],
                                        default: 'inspektorat',
                                        description: 'Lembaga tujuan surat draf',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Draf laporan berhasil dibuat',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DraftResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'UUID tidak valid atau tujuan tidak sah',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Project tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/stats': {
            get: {
                tags: ['Stats'],
                summary: 'Statistik ringkasan',
                description: 'Mengembalikan statistik ringkasan untuk beranda: total proyek, ' +
                    'sebaran kategori (Rendah, Perlu Perhatian, Tinggi), dan rata-rata skor.',
                operationId: 'getStats',
                responses: {
                    '200': {
                        description: 'Statistik ringkasan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/StatsResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/sources': {
            get: {
                tags: ['Sources'],
                summary: 'Daftar sumber data',
                description: 'Mengembalikan daftar sumber data publik yang digunakan, ' +
                    'termasuk lisensi, atribusi, dan waktu terakhir diambil.',
                operationId: 'listSources',
                responses: {
                    '200': {
                        description: 'Daftar sumber data',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SourcesResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/config/scoring': {
            get: {
                tags: ['Config'],
                summary: 'Konfigurasi scoring aktif',
                description: 'Mengembalikan konfigurasi scoring yang sedang aktif: versi, ambang kategori, ' +
                    'poin per tingkat, bobot dimensi, kebijakan data kosong, dan daftar aturan.',
                operationId: 'getScoringConfig',
                responses: {
                    '200': {
                        description: 'Konfigurasi scoring',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ScoringConfigResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/reports': {
            post: {
                tags: ['Reports'],
                summary: 'Kirim laporan warga',
                description: 'Menerima laporan warga terkait proyek. Menghasilkan tiket unik ' +
                    'yang bisa dipakai untuk melacak status laporan.',
                operationId: 'createReport',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateReportRequest' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Laporan berhasil dibuat',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ReportResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'Input tidak valid',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Project tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
            get: {
                tags: ['Reports'],
                summary: 'Lacak laporan warga',
                description: 'Mengembalikan status laporan berdasarkan tiket.',
                operationId: 'trackReport',
                parameters: [
                    {
                        name: 'tiket',
                        in: 'query',
                        required: true,
                        description: 'Tiket laporan',
                        schema: { type: 'string' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Status laporan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ReportResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'Parameter tiket tidak valid',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Laporan tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
        '/admin/reports/{id}': {
            patch: {
                tags: ['Admin'],
                summary: 'Verifikasi laporan warga',
                description: 'Mengubah status laporan menjadi Diverifikasi atau Ditolak. ' +
                    'Jika Diverifikasi, skor proyek terkait akan dihitung ulang.',
                operationId: 'verifyReport',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Tiket laporan',
                        schema: { type: 'string' },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/VerifyReportRequest' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Status laporan berhasil diperbarui',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ReportResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'Input tidak valid',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '404': {
                        description: 'Laporan tidak ditemukan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '409': {
                        description: 'Laporan sudah memiliki status yang sama',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        schemas: {
            ErrorResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'error' },
                    message: { type: 'string', example: 'Internal Server Error' },
                },
                required: ['status', 'message'],
            },
            PingResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Test Ping Server Active !!!' },
                    database_time: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Waktu dari database (SELECT NOW())',
                    },
                    redis_status: { type: 'string', example: 'Redis is Active!' },
                },
                required: ['status', 'message', 'database_time', 'redis_status'],
            },
            WilayahFeature: {
                type: 'object',
                properties: {
                    type: { type: 'string', example: 'Feature' },
                    properties: {
                        type: 'object',
                        properties: {
                            kode_bps: { type: 'string', example: '1871' },
                            nama: { type: 'string', example: 'Kota Bandar Lampung' },
                            lat: { type: 'string', nullable: true, example: '-5.45' },
                            lng: { type: 'string', nullable: true, example: '105.27' },
                        },
                    },
                    geometry: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', example: 'Point' },
                            coordinates: {
                                type: 'array',
                                items: { type: 'number' },
                                example: [105.27, -5.45],
                            },
                        },
                    },
                },
            },
            RegionsResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    regions: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', example: 'FeatureCollection' },
                            features: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/WilayahFeature' },
                            },
                        },
                    },
                },
                required: ['status', 'regions'],
            },
            Project: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    kode_rup: { type: 'string', nullable: true },
                    kode_tender: { type: 'string', nullable: true },
                    nama: { type: 'string', example: 'Pembangunan Embung Kemiling' },
                    dinas: { type: 'string', nullable: true },
                    kode_bps: { type: 'string', nullable: true, example: '1871' },
                    lat: { type: 'string', nullable: true },
                    lng: { type: 'string', nullable: true },
                    tahun_anggaran: { type: 'integer', example: 2025 },
                    sumber_dana: { type: 'string', nullable: true },
                    metode_pemilihan: { type: 'string', nullable: true },
                    pagu: { type: 'string', nullable: true, description: 'Pagu anggaran (bigint as string)' },
                    hps: { type: 'string', nullable: true, description: 'HPS (bigint as string)' },
                    nilai_kontrak: { type: 'string', nullable: true, description: 'Nilai kontrak (bigint as string)' },
                    status: { type: 'string', nullable: true },
                    pengumuman_rup_tgl: { type: 'string', format: 'date', nullable: true },
                    match_status: { type: 'string', nullable: true },
                    skor_total: { type: 'string', nullable: true, description: 'Skor total risiko (numeric as string)' },
                    kategori: {
                        type: 'string',
                        nullable: true,
                        enum: ['Rendah', 'Perlu Perhatian', 'Tinggi'],
                    },
                    is_dummy: { type: 'boolean' },
                    source_id: { type: 'string', nullable: true },
                    source_url: { type: 'string', nullable: true },
                    fetched_at: { type: 'string', format: 'date-time', nullable: true },
                    kabupaten: { type: 'string', nullable: true, description: 'Nama kabupaten dari join wilayah' },
                },
                required: ['id', 'nama', 'tahun_anggaran', 'is_dummy'],
            },
            ProjectsListResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    projects: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Project' },
                    },
                },
                required: ['status', 'projects'],
            },
            ProjectDetailResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    project: { $ref: '#/components/schemas/ProjectDetail' },
                },
                required: ['status', 'project'],
            },
            ProjectReportItem: {
                type: 'object',
                properties: {
                    tiket: { type: 'string', example: 'LPR-ABCD1234-EFGH' },
                    kategori: { type: 'string', nullable: true, example: 'Kualitas pekerjaan' },
                    status: {
                        type: 'string',
                        enum: ['Dilaporkan', 'Diverifikasi', 'Ditolak'],
                        example: 'Diverifikasi',
                    },
                    dibuat_pada: { type: 'string', format: 'date-time', nullable: true },
                },
                required: ['tiket', 'status'],
            },
            ProjectDetail: {
                allOf: [
                    { $ref: '#/components/schemas/Project' },
                    {
                        type: 'object',
                        properties: {
                            laporan_warga: {
                                type: 'object',
                                properties: {
                                    total: { type: 'integer', example: 5, description: 'Total seluruh laporan warga untuk proyek ini' },
                                    items: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/ProjectReportItem' },
                                        description: 'Maksimal 20 item laporan warga terbaru',
                                    },
                                },
                                required: ['total', 'items'],
                            },
                        },
                        required: ['laporan_warga'],
                    },
                ],
            },
            IndicatorFindingRow: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    dimensi: { type: 'string', nullable: true, example: 'D3' },
                    kode_aturan: { type: 'string', nullable: true, example: 'D3-02' },
                    nilai_terukur: { type: 'string', nullable: true, description: 'Nilai terukur (numeric as string)' },
                    ambang: { type: 'string', nullable: true, description: 'Nilai ambang (numeric as string)' },
                    tingkat: {
                        type: 'string',
                        nullable: true,
                        enum: ['rendah', 'sedang', 'tinggi'],
                    },
                    bukti_ref: {
                        type: 'object',
                        nullable: true,
                        description: 'Referensi bukti (JSON)',
                    },
                    sumber: { type: 'string', nullable: true, example: 'SRC-09' },
                    uraian_aturan: { type: 'string', nullable: true },
                    dihitung_pada: { type: 'string', format: 'date-time', nullable: true },
                },
            },
            IndicatorsResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    indicators: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/IndicatorFindingRow' },
                    },
                },
                required: ['status', 'indicators'],
            },
            Payment: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    proyek_id: { type: 'string', format: 'uuid' },
                    termin_ke: { type: 'integer', nullable: true, example: 1 },
                    tanggal: { type: 'string', format: 'date', nullable: true },
                    jumlah: { type: 'string', nullable: true, description: 'Jumlah rupiah (bigint as string)' },
                    persen_kontrak: { type: 'string', nullable: true, description: 'Persen dari nilai kontrak (numeric as string)' },
                    source_id: { type: 'string', nullable: true },
                    source_url: { type: 'string', nullable: true },
                    fetched_at: { type: 'string', format: 'date-time', nullable: true },
                    is_dummy: { type: 'boolean' },
                },
                required: ['id', 'proyek_id', 'is_dummy'],
            },
            Progress: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    proyek_id: { type: 'string', format: 'uuid' },
                    tanggal: { type: 'string', format: 'date', nullable: true },
                    persen_fisik: { type: 'string', nullable: true, description: 'Persen fisik selesai (numeric as string)' },
                    sumber: { type: 'string', nullable: true, example: 'verifikasi lapangan' },
                    source_id: { type: 'string', nullable: true },
                    source_url: { type: 'string', nullable: true },
                    fetched_at: { type: 'string', format: 'date-time', nullable: true },
                    is_dummy: { type: 'boolean' },
                },
                required: ['id', 'proyek_id', 'is_dummy'],
            },
            PaymentsResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    payments: {
                        type: 'object',
                        properties: {
                            proyek_id: { type: 'string', format: 'uuid' },
                            pembayaran: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Payment' },
                            },
                            ringkasan: {
                                type: 'object',
                                properties: {
                                    proyek_id: { type: 'string', format: 'uuid' },
                                    nilai_kontrak: { type: 'string', nullable: true, description: 'Nilai kontrak (bigint as string)' },
                                    total_dibayar: { type: 'number', example: 6282781392 },
                                    persen_dibayar: { type: 'number', example: 90 },
                                    sisa_persen: { type: 'number', example: 10 },
                                    termin_count: { type: 'integer', example: 1 },
                                },
                            },
                        },
                    },
                },
                required: ['status', 'payments'],
            },
            ProgressResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    progress: {
                        type: 'object',
                        properties: {
                            proyek_id: { type: 'string', format: 'uuid' },
                            progres: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Progress' },
                            },
                        },
                    },
                },
                required: ['status', 'progress'],
            },
            RabItem: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    proyek_id: { type: 'string', format: 'uuid' },
                    uraian: { type: 'string', nullable: true, example: 'Lapisan aspal jalan (AC-WC)' },
                    satuan: { type: 'string', nullable: true, example: 'm2' },
                    volume: { type: 'string', nullable: true, description: 'Volume (numeric as string)' },
                    harga_satuan: { type: 'string', nullable: true, description: 'Harga satuan RAB (bigint as string)' },
                    kode_harga_acuan: { type: 'string', nullable: true, example: 'HAC-1' },
                    harga_acuan: { type: 'string', nullable: true, description: 'Harga acuan (bigint as string)' },
                    acuan_uraian: { type: 'string', nullable: true },
                    acuan_satuan: { type: 'string', nullable: true },
                    total: { type: 'string', nullable: true, description: 'volume × harga_satuan (bigint as string)' },
                    deviasi_pct: { type: 'string', nullable: true, description: 'Selisih harga_satuan vs harga_acuan dalam persen (numeric as string)' },
                    source_id: { type: 'string', nullable: true },
                    source_url: { type: 'string', nullable: true },
                    fetched_at: { type: 'string', format: 'date-time', nullable: true },
                    is_dummy: { type: 'boolean' },
                },
                required: ['id', 'proyek_id', 'is_dummy'],
            },
            RabItemsResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    rab_items: {
                        type: 'object',
                        properties: {
                            proyek_id: { type: 'string', format: 'uuid' },
                            items: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/RabItem' },
                            },
                        },
                    },
                },
                required: ['status', 'rab_items'],
            },
            Document: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    proyek_id: { type: 'string', format: 'uuid' },
                    jenis: { type: 'string', example: 'RUP (Rencana Umum Pengadaan)' },
                    wajib: { type: 'boolean' },
                    dipublikasikan: { type: 'boolean' },
                    tanggal: { type: 'string', format: 'date', nullable: true },
                    source_id: { type: 'string', nullable: true },
                    source_url: { type: 'string', nullable: true },
                    fetched_at: { type: 'string', format: 'date-time', nullable: true },
                    is_dummy: { type: 'boolean' },
                },
                required: ['id', 'proyek_id', 'jenis', 'wajib', 'dipublikasikan', 'is_dummy'],
            },
            DokumenRingkasan: {
                type: 'object',
                properties: {
                    total: { type: 'integer', example: 6 },
                    wajib: { type: 'integer', example: 6 },
                    belum_publik: { type: 'integer', example: 4 },
                },
                required: ['total', 'wajib', 'belum_publik'],
            },
            DocumentsResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    documents: {
                        type: 'object',
                        properties: {
                            documents: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Document' },
                            },
                            ringkasan: { $ref: '#/components/schemas/DokumenRingkasan' },
                        },
                    },
                },
                required: ['status', 'documents'],
            },
            ProcedureChecklist: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    proyek_id: { type: 'string', format: 'uuid' },
                    tahapan: { type: 'string', example: 'Pengumuman RUP' },
                    terpenuhi: { type: 'boolean' },
                    source_id: { type: 'string', nullable: true },
                    source_url: { type: 'string', nullable: true },
                    fetched_at: { type: 'string', format: 'date-time', nullable: true },
                    is_dummy: { type: 'boolean' },
                },
                required: ['id', 'proyek_id', 'tahapan', 'terpenuhi', 'is_dummy'],
            },
            ProsedurRingkasan: {
                type: 'object',
                properties: {
                    total: { type: 'integer', example: 7 },
                    terpenuhi: { type: 'integer', example: 4 },
                    tidak_terpenuhi: { type: 'integer', example: 3 },
                },
                required: ['total', 'terpenuhi', 'tidak_terpenuhi'],
            },
            ProcedureChecklistResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    procedure_checklist: {
                        type: 'object',
                        properties: {
                            checklist: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/ProcedureChecklist' },
                            },
                            ringkasan: { $ref: '#/components/schemas/ProsedurRingkasan' },
                        },
                    },
                },
                required: ['status', 'procedure_checklist'],
            },
            LlmTemuan: {
                type: 'object',
                properties: {
                    kode_aturan: { type: 'string', example: 'D3-02' },
                    penjelasan: { type: 'string' },
                    arti_bagi_warga: { type: 'string' },
                },
                required: ['kode_aturan', 'penjelasan', 'arti_bagi_warga'],
            },
            ExplainOutput: {
                type: 'object',
                properties: {
                    generated_by: {
                        type: 'string',
                        enum: ['llm', 'fallback'],
                        description: 'Sumber penjelasan: "llm" jika dari LLM service, "fallback" jika template statis',
                    },
                    ringkasan: { type: 'string', description: 'Ringkasan risiko proyek dalam bahasa awam' },
                    temuan: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/LlmTemuan' },
                        description: 'Daftar temuan per indikator',
                    },
                    keterbatasan: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Daftar keterbatasan data/analisis',
                    },
                    saran_tindak_lanjut: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                langkah: { type: 'string' },
                                lembaga: { type: 'string' },
                            },
                        },
                        description: 'Saran langkah tindak lanjut',
                    },
                    penafian: { type: 'string', description: 'Disclaimer bahwa ini bukan bukti pelanggaran' },
                },
                required: ['generated_by', 'ringkasan', 'temuan', 'keterbatasan', 'penafian'],
            },
            ExplainResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Penjelasan proyek berhasil dibuat' },
                    penjelasan: { $ref: '#/components/schemas/ExplainOutput' },
                },
                required: ['status', 'message', 'penjelasan'],
            },
            DraftOutput: {
                type: 'object',
                properties: {
                    generated_by: {
                        type: 'string',
                        enum: ['llm', 'fallback'],
                        description: 'Sumber draf: "llm" jika dari LLM service, "fallback" jika template statis',
                    },
                    kepada: { type: 'string', description: 'Nama lembaga tujuan surat' },
                    perihal: { type: 'string', description: 'Perihal surat' },
                    pembuka: { type: 'string', description: 'Paragraf pembuka surat' },
                    uraian_indikator: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/LlmTemuan' },
                        description: 'Uraian per indikator dalam surat',
                    },
                    permohonan: { type: 'string', description: 'Paragraf permohonan klarifikasi' },
                    penutup: { type: 'string', description: 'Paragraf penutup surat' },
                    penafian: { type: 'string', description: 'Disclaimer' },
                    lampiran_disarankan: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Daftar lampiran yang disarankan',
                    },
                },
                required: ['generated_by', 'kepada', 'perihal', 'pembuka', 'uraian_indikator', 'permohonan', 'penutup', 'penafian'],
            },
            DraftResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Draf laporan berhasil dibuat' },
                    draft: { $ref: '#/components/schemas/DraftOutput' },
                },
                required: ['status', 'message', 'draft'],
            },
            StatsResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    stats: {
                        type: 'object',
                        properties: {
                            total_proyek: { type: 'integer', example: 13 },
                            kategori: {
                                type: 'object',
                                properties: {
                                    Rendah: { type: 'integer' },
                                    'Perlu Perhatian': { type: 'integer' },
                                    Tinggi: { type: 'integer' },
                                },
                            },
                            rata_rata_skor: { type: 'number', nullable: true },
                        },
                        required: ['total_proyek', 'kategori', 'rata_rata_skor'],
                    },
                },
                required: ['status', 'stats'],
            },
            DataSource: {
                type: 'object',
                properties: {
                    source_id: { type: 'string', example: 'SRC-06' },
                    nama: { type: 'string' },
                    url: { type: 'string', nullable: true },
                    lisensi: { type: 'string', nullable: true },
                    atribusi: { type: 'string', nullable: true },
                    boleh_otomatis: { type: 'boolean' },
                    last_fetched_at: { type: 'string', format: 'date-time', nullable: true },
                    row_count: { type: 'integer', nullable: true },
                },
                required: ['source_id', 'nama', 'boleh_otomatis'],
            },
            SourcesResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    sources: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/DataSource' },
                    },
                },
                required: ['status', 'sources'],
            },
            ScoringRule: {
                type: 'object',
                properties: {
                    code: { type: 'string', example: 'D1-01' },
                    dimension: { type: 'string', example: 'D1' },
                    nama: { type: 'string' },
                    input: { type: 'string' },
                    direction: { type: 'string', enum: ['gte', 'lte'] },
                    sedang: { type: 'number' },
                    tinggi: { type: 'number' },
                    required_fields: { type: 'array', items: { type: 'string' } },
                    sumber: { type: 'string' },
                    uraian_aturan: { type: 'string' },
                },
            },
            ScoringConfigResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    scoring: {
                        type: 'object',
                        properties: {
                            version: { type: 'string', example: '1.1.0' },
                            category_thresholds: {
                                type: 'object',
                                properties: {
                                    rendah_max: { type: 'integer', example: 34 },
                                    perlu_perhatian_max: { type: 'integer', example: 65 },
                                },
                            },
                            level_points: {
                                type: 'object',
                                properties: {
                                    rendah: { type: 'integer', example: 10 },
                                    sedang: { type: 'integer', example: 50 },
                                    tinggi: { type: 'integer', example: 100 },
                                },
                            },
                            dimension_weights: {
                                type: 'object',
                                properties: {
                                    D1: { type: 'number', example: 0.15 },
                                    D2: { type: 'number', example: 0.25 },
                                    D3: { type: 'number', example: 0.2 },
                                    D4: { type: 'number', example: 0.25 },
                                    D5: { type: 'number', example: 0.05 },
                                    D6: { type: 'number', example: 0.1 },
                                },
                            },
                            missing_data_policy: { type: 'string' },
                            rules: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/ScoringRule' },
                            },
                        },
                    },
                },
                required: ['status', 'scoring'],
            },
            CreateReportRequest: {
                type: 'object',
                properties: {
                    proyek_id: { type: 'string', format: 'uuid', description: 'UUID proyek yang dilaporkan' },
                    kategori: { type: 'string', example: 'Kualitas pekerjaan' },
                    keterangan: { type: 'string', example: 'Jalan berlubang dan tidak sesuai spesifikasi' },
                    lat: { type: 'number', nullable: true, example: -5.45 },
                    lng: { type: 'number', nullable: true, example: 105.27 },
                    foto_urls: {
                        type: 'array',
                        items: { type: 'string' },
                        nullable: true,
                    },
                    anonim: { type: 'boolean', default: false },
                },
                required: ['proyek_id', 'kategori', 'keterangan'],
            },
            VerifyReportRequest: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        enum: ['Diverifikasi', 'Ditolak'],
                    },
                    catatan_verifikator: { type: 'string', nullable: true },
                    alasan_tolak: { type: 'string', nullable: true },
                },
                required: ['status'],
            },
            Report: {
                type: 'object',
                properties: {
                    tiket: { type: 'string', example: 'LPR-ABCD1234-EFGH' },
                    proyek_id: { type: 'string', format: 'uuid', nullable: true },
                    kategori: { type: 'string', nullable: true },
                    status: {
                        type: 'string',
                        enum: ['Dilaporkan', 'Diverifikasi', 'Ditolak'],
                    },
                    catatan_verifikator: { type: 'string', nullable: true },
                    alasan_tolak: { type: 'string', nullable: true },
                    dibuat_pada: { type: 'string', format: 'date-time', nullable: true },
                    diubah_pada: { type: 'string', format: 'date-time', nullable: true },
                },
                required: ['tiket', 'status'],
            },
            ReportResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string' },
                    report: { $ref: '#/components/schemas/Report' },
                },
                required: ['status', 'message', 'report'],
            },
        },
    },
};
export default swaggerSpec;
