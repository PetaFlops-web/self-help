import { draftProject, explainProject } from '../services/llm-explanation.js';
import { success } from '../middlewares/response.js';
export async function explain(req, res) {
    const result = await explainProject(req.params.id);
    success(res, 'penjelasan', result, 'Penjelasan proyek berhasil dibuat');
}
export async function draft(req, res) {
    const { tujuan } = req.body;
    const result = await draftProject(req.params.id, tujuan);
    success(res, 'draft', result, 'Draf laporan berhasil dibuat');
}
