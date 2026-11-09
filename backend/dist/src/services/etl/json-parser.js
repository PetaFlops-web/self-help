const FIELD_MAP = {
    kode_rup: 'kode_rup',
    kode_tender: 'kode_tender',
    nama_paket: 'nama',
    nama: 'nama',
    satker: 'dinas',
    dinas: 'dinas',
    kode_bps: 'kode_bps',
    tahun_anggaran: 'tahun_anggaran',
    pagu: 'pagu',
    hps: 'hps',
    sumber_dana: 'sumber_dana',
    metode_pemilihan: 'metode_pemilihan',
    tgl_pembuatan_rup: 'pengumuman_rup_tgl',
    pengumuman_rup_tgl: 'pengumuman_rup_tgl',
};
export function parseJsonImport(jsonContent) {
    let data;
    try {
        data = JSON.parse(jsonContent);
    }
    catch {
        throw new Error('Format JSON tidak valid');
    }
    if (!Array.isArray(data)) {
        throw new Error('JSON harus berupa array objek proyek');
    }
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const obj = data[i];
        if (!obj || typeof obj !== 'object')
            continue;
        const normalized = {};
        const raw = {};
        for (const [key, value] of Object.entries(obj)) {
            const strValue = String(value ?? '');
            raw[key] = strValue;
            const mapped = FIELD_MAP[key];
            if (mapped)
                normalized[mapped] = strValue;
        }
        result.push({ normalized, raw, lineNumber: i + 1 });
    }
    return result;
}
