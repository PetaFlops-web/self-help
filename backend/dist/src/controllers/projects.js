import * as projectsService from '../services/projects.js';
import { ok, respond } from '../middlewares/response.js';
export async function listProjects(req, res) {
    const query = req.query;
    const result = await projectsService.listProjectsPaginatedByFilters(query);
    respond(res, 200, { ...result });
}
export async function getProject(req, res) {
    const id = req.params.id;
    const project = await projectsService.getProject(id);
    ok(res, 'project', project);
}
export async function getProjectIndicators(req, res) {
    const id = req.params.id;
    const indicators = await projectsService.getProjectIndicators(id);
    ok(res, 'indicators', indicators);
}
