import { HttpError } from '../helpers/http.js';
import { verifyPassword } from '../helpers/password.js';
import { signToken } from '../helpers/jwt.js';
import { findUserBySurel, findUserById, toUserProfile } from '../repositories/user.js';
export async function loginUser(body) {
    const user = await findUserBySurel(body.surel);
    if (!user || !user.aktif) {
        throw new HttpError(401, 'Surel atau kata sandi tidak valid');
    }
    const isMatch = await verifyPassword(body.kata_sandi, user.kata_sandi_hash);
    if (!isMatch) {
        throw new HttpError(401, 'Surel atau kata sandi tidak valid');
    }
    const token = signToken({
        sub: user.id,
        surel: user.surel,
        peran: user.peran,
        nama: user.nama,
    });
    return {
        token,
        pengguna: toUserProfile(user),
    };
}
export async function getCurrentUserProfile(userId) {
    const user = await findUserById(userId);
    if (!user || !user.aktif) {
        throw new HttpError(401, 'Pengguna tidak ditemukan atau tidak aktif');
    }
    return toUserProfile(user);
}
