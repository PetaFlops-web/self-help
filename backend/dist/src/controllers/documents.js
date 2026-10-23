import { ok } from '../middlewares/response.js';
import * as documentsService from '../services/documents.js';
export async function getProjectDocuments(req, res) {
    const id = req.params.id;
    const result = await documentsService.getProjectDocuments(id);
    ok(res, 'documents', result);
}
export async function getProjectProcedureChecklist(req, res) {
    const id = req.params.id;
    const result = await documentsService.getProjectProcedureChecklist(id);
    ok(res, 'procedure_checklist', result);
}
