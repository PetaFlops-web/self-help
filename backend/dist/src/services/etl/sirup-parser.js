const FIELD_MAP = {
    kode_rup: 'kode_rup',
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
    const header = rows[0].map((h) => h.trim());
    const columnMap = header.map((h) => {
        if (h in FIELD_MAP)
            return FIELD_MAP[h];
        if (h === 'nama')
            return 'nama';
        return null;
    });
    const result = [];
    for (let r = 1; r < rows.length; r++) {
        const rawRow = rows[r];
        if (rawRow.length === 1 && rawRow[0] === '')
            continue;
        const obj = {};
        for (let c = 0; c < columnMap.length; c++) {
            const internal = columnMap[c];
            if (internal === null)
                continue;
            obj[internal] = rawRow[c] ?? '';
        }
        result.push(obj);
    }
    return result;
}
