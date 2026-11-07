import { loginUser, getCurrentUserProfile } from '../services/auth.js';
import { respond, ok } from '../middlewares/response.js';
export async function login(req, res) {
    const body = req.body;
    const result = await loginUser(body);
    respond(res, 200, {
        token: result.token,
        pengguna: result.pengguna,
    });
}
export async function logout(_req, res) {
    respond(res, 200, { message: 'Logout berhasil' });
}
export async function getMe(req, res) {
    const userId = req.user.id;
    const profile = await getCurrentUserProfile(userId);
    ok(res, 'pengguna', profile);
}
