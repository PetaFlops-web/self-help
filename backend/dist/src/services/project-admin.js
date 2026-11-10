import pool from '../config/database.js';
import { HttpError } from '../helpers/http.js';
import { recalculateProjectScoreInTx } from './project-scoring.js';
import { invalidateCache } from '../middlewares/cache.js';
import { RASIO_MAX, RASIO_MIN } from '../utils/validators/projects.js';
import { checkKodeBpsExists, checkKodeRupExists, checkKodeTenderExists, getProjectForAdmin, getScoreTriggerSnapshot, createProjectAdmin as createProjectRepo, updateProjectAdmin as updateProjectRepo, deleteProjectCascade, insertRiwayatNilai, listValueHistory as listValueHistoryRepo, getTenderById, getTendersByProjectId, createTenderAdmin as createTenderRepo, updateTenderAdmin as updateTenderRepo, deleteTenderAdmin as deleteTenderRepo, PROJECT_WRITABLE_FIELDS, TENDER_WRITABLE_FIELDS, SCORE_TRIGGER_COLUMNS, } from '../repositories/project-admin.js';
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const CACHE_NAMESPACES = ['projects', 'stats', 'reports'];
const PEMERINTAH_FORBIDDEN = 'Proyek dari sumber pemerintah hanya dapat diubah lewat ETL, tidak lewat panel admin.';
async function withTransaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        // Pengaman lapis DB: indeks unik kode_rup/kode_tender menolak permintaan
        // bersamaan yang lolos pengecekan aplikasi.
        if (err.code === '23505') {
            throw new HttpError(409, 'kode_rup atau kode_tender sudah digunakan proyek lain');
        }
        throw err;
    }
    finally {
        client.release();
    }
}
function toNumberOrNull(v) {
    if (v === null || v === undefined || v === '')
        return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}
function normalize(v) {
    return v === null || v === undefined ? null : String(v);
}
function diffFields(before, after, fields) {
    const changes = {};
    for (const f of fields) {
        if (normalize(before[f]) !== normalize(after[f])) {
            changes[f] = { lama: before[f] ?? null, baru: after[f] ?? null };
        }
    }
    return changes;
}
/**
 * Tolak hps/nilai_kontrak di luar 20%–300% dari pagu, diperiksa terhadap nilai
 * EFEKTIF (body digabung nilai tersimpan). Tanpa ini, PATCH yang hanya
 * mengirim hps — atau hanya pagu — lolos tanpa pemeriksaan rasio.
 */
function assertValueRatios(effective) {
    const pagu = toNumberOrNull(effective.pagu);
    if (pagu === null || pagu <= 0)
        return;
    for (const field of ['hps', 'nilai_kontrak']) {
        const value = toNumberOrNull(effective[field]);
        if (value === null)
            continue;
        const ratio = value / pagu;
        if (ratio < RASIO_MIN || ratio > RASIO_MAX) {
            throw new HttpError(400, `${field} ${value} berada di luar rentang 20%–300% dari pagu ${pagu} ` +
                `(rentang sah ${Math.ceil(pagu * RASIO_MIN)}–${Math.floor(pagu * RASIO_MAX)})`);
        }
    }
}
async function assertKodeBps(client, kodeBps) {
    if (kodeBps !== undefined && !(await checkKodeBpsExists(client, String(kodeBps)))) {
        throw new HttpError(400, `kode_bps "${kodeBps}" tidak terdaftar di wilayah`);
    }
}
async function assertUniqueCodes(client, data, excludeId) {
    if (data.kode_rup && (await checkKodeRupExists(client, String(data.kode_rup), excludeId))) {
        throw new HttpError(409, `kode_rup "${data.kode_rup}" sudah digunakan proyek lain`);
    }
    if (data.kode_tender && (await checkKodeTenderExists(client, String(data.kode_tender), excludeId))) {
        throw new HttpError(409, `kode_tender "${data.kode_tender}" sudah digunakan proyek lain`);
    }
}
async function lockEditableProject(client, id) {
    const project = await getProjectForAdmin(client, id, true);
    if (!project)
        throw new HttpError(404, 'Proyek tidak ditemukan');
    if (project.asal_data === 'pemerintah')
        throw new HttpError(403, PEMERINTAH_FORBIDDEN);
    return project;
}
/**
 * Hitung ulang skor lalu catat setiap nilai pemicu skor yang berubah ke
 * riwayat_nilai (FR-59, pengaman 4). Berjalan di transaksi yang sama dengan
 * perubahan datanya: bila pencatatan gagal, perubahan ikut dibatalkan —
 * tidak ada nilai yang bergeser tanpa jejak.
 */
async function rescoreAndRecordHistory(client, projectId, before, skorSebelum, ctx) {
    const score = await recalculateProjectScoreInTx(client, projectId);
    const after = await getScoreTriggerSnapshot(client, projectId);
    let riwayat = 0;
    for (const kolom of SCORE_TRIGGER_COLUMNS) {
        if (before[kolom] === after[kolom])
            continue;
        await insertRiwayatNilai(client, {
            proyek_id: projectId,
            kolom,
            nilai_lama: before[kolom],
            nilai_baru: after[kolom],
            skor_sebelum: skorSebelum,
            skor_sesudah: score.skor_total,
            aktor_id: ctx.actor.id,
            aktor_nama: ctx.actor.nama,
            peran: ctx.actor.peran,
            ip: ctx.ip,
        });
        riwayat += 1;
    }
    return { skorSesudah: score.skor_total, kategori: score.kategori, riwayat };
}
const EMPTY_SNAPSHOT = {
    pagu: null, hps: null, nilai_kontrak: null, jumlah_penawar: null, hari_rup_ke_tender: null,
};
export async function createProject(data, ctx) {
    assertValueRatios({ pagu: data.pagu, hps: data.hps, nilai_kontrak: data.nilai_kontrak });
    const project = await withTransaction(async (client) => {
        await assertKodeBps(client, data.kode_bps);
        await assertUniqueCodes(client, data);
        const id = await createProjectRepo(client, data, ctx.actor.id);
        // Nilai awal juga dicatat (nilai_lama null) agar riwayat dimulai dari asalnya.
        await rescoreAndRecordHistory(client, id, EMPTY_SNAPSHOT, null, ctx);
        return (await getProjectForAdmin(client, id));
    });
    await invalidateCache(...CACHE_NAMESPACES);
    const changes = diffFields({}, project, [...PROJECT_WRITABLE_FIELDS, 'asal_data']);
    return { project, changes };
}
export async function updateProject(id, data, ctx) {
    const result = await withTransaction(async (client) => {
        const existing = await lockEditableProject(client, id);
        await assertKodeBps(client, data.kode_bps);
        await assertUniqueCodes(client, data, id);
        if (data.pagu !== undefined || data.hps !== undefined || data.nilai_kontrak !== undefined) {
            assertValueRatios({
                pagu: data.pagu ?? existing.pagu,
                hps: data.hps ?? existing.hps,
                nilai_kontrak: data.nilai_kontrak ?? existing.nilai_kontrak,
            });
        }
        const skorSebelum = toNumberOrNull(existing.skor_total);
        const before = await getScoreTriggerSnapshot(client, id);
        await updateProjectRepo(client, id, data, ctx.actor.id);
        const scored = await rescoreAndRecordHistory(client, id, before, skorSebelum, ctx);
        const project = (await getProjectForAdmin(client, id));
        const changes = diffFields(existing, project, PROJECT_WRITABLE_FIELDS);
        return { project, skorSebelum, skorSesudah: scored.skorSesudah, changes, riwayat: scored.riwayat };
    });
    await invalidateCache(...CACHE_NAMESPACES);
    return result;
}
export async function deleteProject(id, _ctx) {
    const snapshot = await withTransaction(async (client) => {
        const existing = await lockEditableProject(client, id);
        await deleteProjectCascade(client, id);
        return existing;
    });
    await invalidateCache(...CACHE_NAMESPACES);
    return { deletedId: id, snapshot };
}
export async function createTender(proyekId, data, ctx) {
    const result = await withTransaction(async (client) => {
        const project = await lockEditableProject(client, proyekId);
        const skorSebelum = toNumberOrNull(project.skor_total);
        const before = await getScoreTriggerSnapshot(client, proyekId);
        const tenderId = await createTenderRepo(client, proyekId, data);
        const scored = await rescoreAndRecordHistory(client, proyekId, before, skorSebelum, ctx);
        const tender = (await getTenderById(client, tenderId));
        const changes = diffFields({}, tender, TENDER_WRITABLE_FIELDS);
        return { tender, skorSebelum, skorSesudah: scored.skorSesudah, changes };
    });
    await invalidateCache(...CACHE_NAMESPACES);
    return result;
}
async function lockEditableTender(client, id) {
    const peek = await getTenderById(client, id);
    if (!peek)
        throw new HttpError(404, 'Tender tidak ditemukan');
    // Kunci proyek induk lebih dulu (urutan sama dengan jalur proyek) agar tidak deadlock.
    const project = await lockEditableProject(client, peek.proyek_id);
    const tender = await getTenderById(client, id, true);
    if (!tender)
        throw new HttpError(404, 'Tender tidak ditemukan');
    return { tender, project };
}
export async function updateTender(id, data, ctx) {
    const result = await withTransaction(async (client) => {
        const { tender: existing, project } = await lockEditableTender(client, id);
        const skorSebelum = toNumberOrNull(project.skor_total);
        const before = await getScoreTriggerSnapshot(client, project.id);
        await updateTenderRepo(client, id, data);
        const scored = await rescoreAndRecordHistory(client, project.id, before, skorSebelum, ctx);
        const tender = (await getTenderById(client, id));
        const changes = diffFields(existing, tender, TENDER_WRITABLE_FIELDS);
        return { tender, skorSebelum, skorSesudah: scored.skorSesudah, changes };
    });
    await invalidateCache(...CACHE_NAMESPACES);
    return result;
}
export async function deleteTender(id, ctx) {
    const result = await withTransaction(async (client) => {
        const { tender, project } = await lockEditableTender(client, id);
        const skorSebelum = toNumberOrNull(project.skor_total);
        const before = await getScoreTriggerSnapshot(client, project.id);
        await deleteTenderRepo(client, id);
        const scored = await rescoreAndRecordHistory(client, project.id, before, skorSebelum, ctx);
        return { deletedId: id, proyekId: project.id, snapshot: tender, skorSebelum, skorSesudah: scored.skorSesudah };
    });
    await invalidateCache(...CACHE_NAMESPACES);
    return result;
}
export async function getValueHistory(projectId, limit, offset) {
    const finalLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const finalOffset = offset ?? 0;
    const result = await listValueHistoryRepo(projectId, finalLimit, finalOffset);
    return { ...result, limit: finalLimit, offset: finalOffset };
}
export async function getProjectTenders(projectId) {
    const client = await pool.connect();
    try {
        const project = await getProjectForAdmin(client, projectId);
        if (!project)
            throw new HttpError(404, 'Proyek tidak ditemukan');
        const tenders = await getTendersByProjectId(client, projectId);
        return { tenders };
    }
    finally {
        client.release();
    }
}
