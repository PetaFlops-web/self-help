import type { Request, Response } from 'express';
import { loginUser, getCurrentUserProfile } from '../services/auth.js';
import { respond, ok } from '../middlewares/response.js';
import type { LoginBody } from '../utils/validators/auth.js';

export async function login(req: Request, res: Response): Promise<void> {
  const body = req.body as LoginBody;
  const result = await loginUser(body);
  respond(res, 200, {
    token: result.token,
    pengguna: result.pengguna,
  });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  respond(res, 200, { message: 'Logout berhasil' });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const profile = await getCurrentUserProfile(userId);
  ok(res, 'pengguna', profile);
}
