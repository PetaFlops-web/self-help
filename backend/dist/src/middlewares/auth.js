import { HttpError } from '../helpers/http.js';
import { verifyToken } from '../helpers/jwt.js';
import { findUserById } from '../repositories/user.js';
export async function requireAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new HttpError(401, 'Token autentikasi diperlukan');
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
        throw new HttpError(401, 'Token autentikasi diperlukan');
    }
    try {
        const payload = verifyToken(token);
        const user = await findUserById(payload.sub);
        if (!user || !user.aktif) {
            throw new HttpError(401, 'Pengguna tidak ditemukan atau telah dinonaktifkan');
        }
        req.user = {
            id: user.id,
            surel: user.surel,
            peran: user.peran,
            nama: user.nama,
        };
        next();
    }
    catch (err) {
        if (err instanceof HttpError) {
            throw err;
        }
        throw new HttpError(401, 'Token tidak valid atau kedaluwarsa');
    }
}
export function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            throw new HttpError(401, 'Autentikasi diperlukan');
        }
        if (!roles.includes(req.user.peran)) {
            throw new HttpError(403, 'Akses ditolak: peran tidak mencukupi');
        }
        next();
    };
}
