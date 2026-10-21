import { draftProject, explainProject } from '../services/llm-explanation.js';
import { HttpError } from '../helpers/http.js';
import { success } from '../middlewares/response.js';
import { LEMBAGA_TUJUAN } from '../types/llm.js';
export async function explain(req, res) {
    const result = await explainProject(req.params.id);
    success(res, 'penjelasan', result, 'Penjelasan proyek berhasil dibuat');
}
export async function draft(req, res) {
    const body = (req.body ?? {});
    const raw = body.tujuan;
    let tujuan = 'inspektorat';
    if (raw !== undefined) {
        if (typeof raw !== 'string' || !LEMBAGA_TUJUAN.includes(raw)) {
            throw new HttpError(400, `tujuan harus salah satu dari: ${LEMBAGA_TUJUAN.join(', ')}`);
        }
        tujuan = raw;
    }
    const result = await draftProject(req.params.id, tujuan);
    success(res, 'draft', result, 'Draf laporan berhasil dibuat');
}
