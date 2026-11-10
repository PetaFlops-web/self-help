import pool from '../config/database.js';
import { getProjectById } from '../repositories/project.js';
import { getProgressById, insertProgress, updateProgress, deleteProgress, } from '../repositories/progress.js';
import { recalculateProjectScoreInTx } from './project-scoring.js';
import { HttpError, isUuid } from '../helpers/http.js';
export async function createProgress(projectId, input) {
    if (!isUuid(projectId)) {
        throw new HttpError(400, 'id project harus UUID yang valid');
    }
    const project = await getProjectById(projectId);
    if (!project) {
        throw new HttpError(404, 'Proyek tidak ditemukan');
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const progress = await insertProgress(client, {
            proyek_id: projectId,
            tanggal: input.tanggal,
            persen_fisik: input.persen_fisik,
            sumber: 'verifikator',
            is_dummy: false,
        });
        const scoring = await recalculateProjectScoreInTx(client, projectId);
        await client.query('COMMIT');
        return { progres: progress, scoring };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
export async function updateProgressById(id, input) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id progres harus UUID yang valid');
    }
    const existing = await getProgressById(pool, id);
    if (!existing) {
        throw new HttpError(404, 'Progres tidak ditemukan');
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const updated = await updateProgress(client, id, input);
        if (!updated) {
            throw new HttpError(404, 'Progres tidak ditemukan');
        }
        const scoring = await recalculateProjectScoreInTx(client, existing.proyek_id);
        await client.query('COMMIT');
        return { progres: updated, scoring };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
export async function deleteProgressById(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id progres harus UUID yang valid');
    }
    const existing = await getProgressById(pool, id);
    if (!existing) {
        throw new HttpError(404, 'Progres tidak ditemukan');
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await deleteProgress(client, id);
        const scoring = await recalculateProjectScoreInTx(client, existing.proyek_id);
        await client.query('COMMIT');
        return { deleted: existing, scoring };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
