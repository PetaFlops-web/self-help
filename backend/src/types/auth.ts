export type UserRole = 'admin' | 'verifikator' | 'peninjau';

export interface UserRow {
  id: string;
  nama: string;
  surel: string;
  kata_sandi_hash: string;
  peran: UserRole;
  aktif: boolean;
  dibuat_pada: Date | string;
}

export interface AuthTokenPayload {
  sub: string;
  surel: string;
  peran: UserRole;
  nama: string;
}

export interface AuthUser {
  id: string;
  surel: string;
  peran: UserRole;
  nama: string;
}

export interface UserProfile {
  id: string;
  nama: string;
  surel: string;
  peran: UserRole;
  aktif: boolean;
  dibuat_pada: string;
}

export interface LoginResult {
  token: string;
  pengguna: UserProfile;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
