import type { Response } from 'express';

export type ApiStatus = 'success' | 'error';

function statusFor(httpStatus: number): ApiStatus {
  return httpStatus >= 200 && httpStatus < 400 ? 'success' : 'error';
}

export function respond(res: Response, httpStatus: number, body: Record<string, unknown>): void {
  res.status(httpStatus).json({ status: statusFor(httpStatus), ...body });
}

export function ok<T>(res: Response, resource: string, data: T, httpStatus = 200): void {
  respond(res, httpStatus, { [resource]: data });
}

export function success<T>(
  res: Response,
  resource: string,
  data: T,
  message: string,
  httpStatus = 200,
): void {
  respond(res, httpStatus, { message, [resource]: data });
}

export function created<T>(res: Response, resource: string, data: T, message: string): void {
  success(res, resource, data, message, 201);
}

export function updated<T>(res: Response, resource: string, data: T, message: string): void {
  success(res, resource, data, message, 200);
}

/** Hapus (DELETE, 200) — `{ status: 'success', message, [resource]: id }`. */
export function removed(res: Response, resource: string, id: string, message: string): void {
  respond(res, 200, { message, [resource]: id });
}

export function sendError(res: Response, httpStatus: number, message: string): void {
  respond(res, httpStatus, { message });
}
