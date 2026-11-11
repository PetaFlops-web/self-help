export function tokenizeCsv(csv) {
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
export function parseRawCsv(csvContent) {
    const rows = tokenizeCsv(csvContent);
    if (rows.length === 0) {
        return { headers: new Set(), records: [] };
    }
    const rawHeaders = rows[0];
    const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, '').trim());
    const headerSet = new Set(headers.map((h) => h.toLowerCase()).filter(Boolean));
    const records = [];
    for (let r = 1; r < rows.length; r++) {
        const rawRow = rows[r];
        if (rawRow.length === 1 && rawRow[0] === '')
            continue;
        const raw = {};
        for (let c = 0; c < headers.length; c++) {
            const key = rawHeaders[c] || `kolom_${c + 1}`;
            raw[key] = rawRow[c] ?? '';
        }
        records.push({ raw, lineNumber: r + 1 });
    }
    return { headers: headerSet, records };
}
export function parseRawJson(jsonContent, arrayErrorMessage = 'JSON harus berupa array objek') {
    let data;
    try {
        data = JSON.parse(jsonContent);
    }
    catch {
        throw new Error('Format JSON tidak valid');
    }
    if (!Array.isArray(data)) {
        throw new Error(arrayErrorMessage);
    }
    const headerSet = new Set();
    const records = [];
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (!item || typeof item !== 'object' || Array.isArray(item))
            continue;
        const raw = {};
        for (const [key, value] of Object.entries(item)) {
            const normalizedKey = key.trim();
            if (normalizedKey)
                headerSet.add(normalizedKey.toLowerCase());
            raw[key] = String(value ?? '');
        }
        records.push({ raw, lineNumber: i + 1 });
    }
    return { headers: headerSet, records };
}
export function mapRawRecords(records, fieldMap, passthroughKeys = []) {
    const passthrough = new Set(passthroughKeys.map((k) => k.toLowerCase()));
    return records.map(({ raw, lineNumber }) => {
        const normalized = {};
        for (const [key, value] of Object.entries(raw)) {
            const trimmed = key.replace(/^\uFEFF/, '').trim();
            const lower = trimmed.toLowerCase();
            const target = fieldMap[trimmed] ?? fieldMap[lower] ?? (passthrough.has(lower) ? lower : undefined);
            if (target && (normalized[target] === undefined || (normalized[target] === '' && value !== ''))) {
                normalized[target] = value;
            }
        }
        return { normalized, raw, lineNumber };
    });
}
