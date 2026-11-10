import pool from '../config/database.js';
import { getProjectById } from '../repositories/project.js';
import { getRabItemById, insertRabItem, updateRabItem, deleteRabItem, } from '../repositories/rab-items.js';
import { recalculateProjectScoreInTx } from './project-scoring.js';
import { HttpError, isUuid } from '../helpers/http.js';
export async function createRabItem(projectId, input) {
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
        const rabItem = await insertRabItem(client, {
            proyek_id: projectId,
            uraian: input.uraian,
            satuan: input.satuan,
            volume: input.volume,
            harga_satuan: input.harga_satuan,
            kode_harga_acuan: input.kode_harga_acuan,
            is_dummy: false,
        });
        const scoring = await recalculateProjectScoreInTx(client, projectId);
        await client.query('COMMIT');
        return { rab_item: rabItem, scoring };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
export async function updateRabItemById(id, input) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id rab-item harus UUID yang valid');
    }
    const existing = await getRabItemById(pool, id);
    if (!existing) {
        throw new HttpError(404, 'Item RAB tidak ditemukan');
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const updated = await updateRabItem(client, id, input);
        if (!updated) {
            throw new HttpError(404, 'Item RAB tidak ditemukan');
        }
        const scoring = await recalculateProjectScoreInTx(client, existing.proyek_id);
        await client.query('COMMIT');
        return { rab_item: updated, scoring };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
export async function deleteRabItemById(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id rab-item harus UUID yang valid');
    }
    const existing = await getRabItemById(pool, id);
    if (!existing) {
        throw new HttpError(404, 'Item RAB tidak ditemukan');
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await deleteRabItem(client, id);
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
