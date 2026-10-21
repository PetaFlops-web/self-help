function statusFor(httpStatus) {
    return httpStatus >= 200 && httpStatus < 400 ? 'success' : 'error';
}
/** Inti envelope: kirim `{ status, ...body }` dengan status diturunkan dari kode HTTP. */
export function respond(res, httpStatus, body) {
    res.status(httpStatus).json({ status: statusFor(httpStatus), ...body });
}
/** Baca (GET) — `{ status: 'success', [resource]: data }`. */
export function ok(res, resource, data, httpStatus = 200) {
    respond(res, httpStatus, { [resource]: data });
}
/** Sukses bermuatan pesan (POST/PUT/PATCH) — `{ status: 'success', message, [resource]: data }`. */
export function success(res, resource, data, message, httpStatus = 200) {
    respond(res, httpStatus, { message, [resource]: data });
}
/** Buat (POST, 201) — `{ status: 'success', message, [resource]: data }`. */
export function created(res, resource, data, message) {
    success(res, resource, data, message, 201);
}
/** Ubah (PUT/PATCH, 200) — `{ status: 'success', message, [resource]: data }`. */
export function updated(res, resource, data, message) {
    success(res, resource, data, message, 200);
}
/** Hapus (DELETE, 200) — `{ status: 'success', message, [resource]: id }`. */
export function removed(res, resource, id, message) {
    respond(res, 200, { message, [resource]: id });
}
/** Galat — `{ status: 'error', message }`. */
export function sendError(res, httpStatus, message) {
    respond(res, httpStatus, { message });
}
