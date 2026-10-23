import { HttpError, isUuid } from '../helpers/http.js';
import { getProjectById } from '../repositories/project.js';
import { countDocumentSummary, countProcedureSummary, listDocumentsByProjectId, listProcedureChecklistsByProjectId, } from '../repositories/documents.js';
export async function getProjectDocuments(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id project harus UUID yang valid');
    }
    const project = await getProjectById(id);
    if (!project) {
        throw new HttpError(404, 'Project tidak ditemukan');
    }
    const [documents, ringkasan] = await Promise.all([
        listDocumentsByProjectId(id),
        countDocumentSummary(id),
    ]);
    return { documents, ringkasan };
}
export async function getProjectProcedureChecklist(id) {
    if (!isUuid(id)) {
        throw new HttpError(400, 'id project harus UUID yang valid');
    }
    const project = await getProjectById(id);
    if (!project) {
        throw new HttpError(404, 'Project tidak ditemukan');
    }
    const [checklist, ringkasan] = await Promise.all([
        listProcedureChecklistsByProjectId(id),
        countProcedureSummary(id),
    ]);
    return { checklist, ringkasan };
}
