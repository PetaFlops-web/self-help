import * as financialsService from '../services/financials.js';
import { ok } from '../middlewares/response.js';
export async function getProjectPayments(req, res) {
    const id = req.params.id;
    const result = await financialsService.getProjectPayments(id);
    ok(res, 'payments', result);
}
export async function getProjectProgress(req, res) {
    const id = req.params.id;
    const result = await financialsService.getProjectProgress(id);
    ok(res, 'progress', result);
}
export async function getProjectRabItems(req, res) {
    const id = req.params.id;
    const result = await financialsService.getProjectRabItems(id);
    ok(res, 'rab_items', result);
}
