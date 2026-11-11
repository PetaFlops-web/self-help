import type { Request, Response } from 'express';
import * as projectsService from '../services/projects.js';
import { ok, respond } from '../middlewares/response.js';

export async function listProjects(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, unknown>;
  const result = await projectsService.listProjectsPaginatedByFilters(query);
  respond(res, 200, { ...result });
}

export async function getProject(req: Request<{ id: string }>, res: Response): Promise<void> {
  const id = req.params.id;
  const project = await projectsService.getProject(id);
  ok(res, 'project', project);
}

export async function getProjectIndicators(req: Request<{ id: string }>, res: Response): Promise<void> {
  const id = req.params.id;
  const indicators = await projectsService.getProjectIndicators(id);
  ok(res, 'indicators', indicators);
}
