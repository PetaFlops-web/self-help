const FIELD_MAP = {
    kode_rup: 'kode_rup',
    kode_tender: 'kode_tender',
    nama_paket: 'nama',
    satker: 'dinas',
    kode_bps: 'kode_bps',
    tahun_anggaran: 'tahun_anggaran',
    pagu: 'pagu',
    hps: 'hps',
    sumber_dana: 'sumber_dana',
    metode_pemilihan: 'metode_pemilihan',
    tgl_pembuatan_rup: 'pengumuman_rup_tgl',
};
function tokenize(csv) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < csv.length) {
        const ch = csv[i];
        if (inQuotes) {
            if (ch === '"') {
                if (csv[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i += 1;
                continue;
            }
            field += ch;
            i += 1;
            continue;
        }
        if (ch === '"') {
            inQuotes = true;
            i += 1;
            continue;
        }
        if (ch === ',') {
            row.push(field);
            field = '';
            i += 1;
            continue;
        }
        if (ch === '\r') {
            i += 1;
            continue;
        }
        if (ch === '\n') {
            row.push(field);
            field = '';
            rows.push(row);
            row = [];
            i += 1;
            continue;
        }
        field += ch;
        i += 1;
    }
    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}
export function parseSiRUPCsv(csvContent) {
    const rows = tokenize(csvContent);
    if (rows.length === 0)
        return [];
    const rawHeaders = rows[0];
    const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, '').trim());
    const columnMap = headers.map((header) => {
        if (header in FIELD_MAP)
            return FIELD_MAP[header];
        if (header === 'nama')
            return 'nama';
        return null;
    });
    const result = [];
    for (let r = 1; r < rows.length; r++) {
        const rawRow = rows[r];
        if (rawRow.length === 1 && rawRow[0] === '')
            continue;
        const normalized = {};
        const raw = {};
        for (let c = 0; c < headers.length; c++) {
            const key = rawHeaders[c] || `kolom_${c + 1}`;
            const value = rawRow[c] ?? '';
            raw[key] = value;
            const internal = columnMap[c];
            if (internal !== null)
                normalized[internal] = value;
        }
        result.push({ normalized, raw, lineNumber: r + 1 });
    }
    return result;
}
