import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from '../helpers/http.js';

function formatZodError(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'body';
      return `${field}: ${issue.message}`;
    })
    .join('; ');
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      next(new HttpError(400, formatZodError(result.error)));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams<T extends Record<string, unknown>>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(new HttpError(400, formatZodError(result.error)));
      return;
    }
    Object.assign(req.params, result.data);
    next();
  };
}
