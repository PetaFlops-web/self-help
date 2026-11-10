import { createProject, updateProject, deleteProject, createTender, updateTender, deleteTender, getValueHistory, getProjectTenders, } from '../services/project-admin.js';
import { respond } from '../middlewares/response.js';
import { recordAudit } from '../helpers/audit.js';
import { HttpError, positiveIntParam, intParam } from '../helpers/http.js';
function getAuditContext(req) {
    const rawIp = req.headers['x-real-ip'];
    return {
        actor: {
            id: req.user?.id ?? '',
            nama: req.user?.nama ?? 'Unknown',
            peran: req.user?.peran ?? 'system',
        },
        ip: typeof rawIp === 'string' ? rawIp : (req.ip || null),
    };
}
export async function createProjectHandler(req, res) {
    const body = req.body;
    const ctx = getAuditContext(req);
    const { project } = await createProject(body, ctx);
    await recordAudit({
        aktor_id: ctx.actor.id || null,
        aktor_nama: ctx.actor.nama,
        peran: ctx.actor.peran,
        modul: 'proyek',
        aksi: 'CREATE_PROJECT',
        target_id: project.id,
        diff: { nama: project.nama, asal_data: 'manual_admin' },
        ip: ctx.ip,
    });
    respond(res, 201, { project });
}
export async function updateProjectHandler(req, res) {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id)
        throw new HttpError(400, 'id wajib diisi');
    const body = req.body;
    const ctx = getAuditContext(req);
    const { project, skorSebelum, skorSesudah, changes } = await updateProject(id, body, ctx);
    await recordAudit({
        aktor_id: ctx.actor.id || null,
        aktor_nama: ctx.actor.nama,
        peran: ctx.actor.peran,
        modul: 'proyek',
        aksi: 'UPDATE_PROJECT',
        target_id: id,
        diff: changes,
        ip: ctx.ip,
    });
    respond(res, 200, { project, skor_sebelum: skorSebelum, skor_sesudah: skorSesudah });
}
export async function deleteProjectHandler(req, res) {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id)
        throw new HttpError(400, 'id wajib diisi');
    const ctx = getAuditContext(req);
    const { deletedId } = await deleteProject(id, ctx);
    await recordAudit({
        aktor_id: ctx.actor.id || null,
        aktor_nama: ctx.actor.nama,
        peran: ctx.actor.peran,
        modul: 'proyek',
        aksi: 'DELETE_PROJECT',
        target_id: deletedId,
        diff: {},
        ip: ctx.ip,
    });
    respond(res, 200, { deleted: true, id: deletedId });
}
export async function createTenderHandler(req, res) {
    const proyekId = typeof req.params.id === 'string' ? req.params.id : '';
    if (!proyekId)
        throw new HttpError(400, 'id proyek wajib diisi');
    const body = req.body;
    const ctx = getAuditContext(req);
    const { tender } = await createTender(proyekId, body, ctx);
    await recordAudit({
        aktor_id: ctx.actor.id || null,
        aktor_nama: ctx.actor.nama,
        peran: ctx.actor.peran,
        modul: 'proyek',
        aksi: 'CREATE_TENDER',
        target_id: tender.id,
        diff: { proyek_id: proyekId, jumlah_penawar: tender.jumlah_penawar },
        ip: ctx.ip,
    });
    respond(res, 201, { tender });
}
export async function updateTenderHandler(req, res) {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id)
        throw new HttpError(400, 'id tender wajib diisi');
    const body = req.body;
    const ctx = getAuditContext(req);
    const { tender } = await updateTender(id, body, ctx);
    await recordAudit({
        aktor_id: ctx.actor.id || null,
        aktor_nama: ctx.actor.nama,
        peran: ctx.actor.peran,
        modul: 'proyek',
        aksi: 'UPDATE_TENDER',
        target_id: id,
        diff: { changed: Object.keys(body) },
        ip: ctx.ip,
    });
    respond(res, 200, { tender });
}
export async function deleteTenderHandler(req, res) {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id)
        throw new HttpError(400, 'id tender wajib diisi');
    const ctx = getAuditContext(req);
    const { deletedId, proyekId } = await deleteTender(id, ctx);
    await recordAudit({
        aktor_id: ctx.actor.id || null,
        aktor_nama: ctx.actor.nama,
        peran: ctx.actor.peran,
        modul: 'proyek',
        aksi: 'DELETE_TENDER',
        target_id: deletedId,
        diff: { proyek_id: proyekId },
        ip: ctx.ip,
    });
    respond(res, 200, { deleted: true, id: deletedId });
}
export async function valueHistoryHandler(req, res) {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!id)
        throw new HttpError(400, 'id wajib diisi');
    const limit = positiveIntParam(req.query.limit);
    if (req.query.limit !== undefined && limit === undefined) {
        throw new HttpError(400, 'limit harus bilangan bulat positif');
    }
    const offset = intParam(req.query.offset);
    if (req.query.offset !== undefined && (offset === undefined || offset < 0)) {
        throw new HttpError(400, 'offset harus bilangan bulat non-negatif');
    }
    const result = await getValueHistory(id, limit, offset);
    respond(res, 200, {
        history: result.rows,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
    });
}
export async function getProjectTendersHandler(req, res) {
    const projectId = typeof req.params.id === 'string' ? req.params.id : '';
    if (!projectId)
        throw new HttpError(400, 'id proyek wajib diisi');
    const { tenders } = await getProjectTenders(projectId);
    respond(res, 200, { tenders });
}
