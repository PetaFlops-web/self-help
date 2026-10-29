import { HttpError } from '../helpers/http.js';
function formatZodError(error) {
    return error.issues
        .map((issue) => {
        const field = issue.path.length > 0 ? issue.path.join('.') : 'body';
        return `${field}: ${issue.message}`;
    })
        .join('; ');
}
export function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body ?? {});
        if (!result.success) {
            next(new HttpError(400, formatZodError(result.error)));
            return;
        }
        req.body = result.data;
        next();
    };
}
export function validateParams(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            next(new HttpError(400, formatZodError(result.error)));
            return;
        }
        Object.assign(req.params, result.data);
        next();
    };
}
