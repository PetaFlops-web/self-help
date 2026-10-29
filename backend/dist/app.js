import express from 'express';
import cors from 'cors';
import { config, isDev, isProd } from './src/config/env.js';
import { HttpError } from './src/helpers/http.js';
import { sendError } from './src/middlewares/response.js';
import { generalLimiter } from './src/middlewares/rate-limit.js';
import { UPLOAD_ROOT } from './src/middlewares/upload.js';
import pingRouter from './src/routes/ping.js';
import regionsRouter from './src/routes/regions.js';
import projectsRouter from './src/routes/projects.js';
import statsRouter from './src/routes/stats.js';
import sourcesRouter from './src/routes/sources.js';
import configRouter from './src/routes/config.js';
import llmRouter from './src/routes/llm.js';
import docsRouter from './src/routes/docs.js';
import financialsRouter from './src/routes/financials.js';
import reportsRouter from './src/routes/reports.js';
import adminReportsRouter from './src/routes/admin-reports.js';
import documentsRouter from './src/routes/documents.js';
const app = express();
app.set('trust proxy', 1);
if (isProd && config.allowedOrigins.length > 0) {
    app.use(cors({ origin: config.allowedOrigins }));
}
else {
    app.use(cors());
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Sajikan media laporan yang diunggah (dev: disk lokal uploads/).
app.use('/uploads', express.static(UPLOAD_ROOT));
if (isDev) {
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        next();
    });
}
// --- Routes ---
app.use('/api', generalLimiter);
app.use('/api', pingRouter);
app.use('/api', regionsRouter);
app.use('/api', projectsRouter);
app.use('/api', financialsRouter);
app.use('/api', statsRouter);
app.use('/api', sourcesRouter);
app.use('/api', configRouter);
app.use('/api', llmRouter);
app.use('/api', reportsRouter);
app.use('/api', adminReportsRouter);
app.use('/api', documentsRouter);
if (isDev) {
    app.use('/', docsRouter);
}
app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
        sendError(res, err.status, err.message);
        return;
    }
    if (isDev) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.error('Unhandled error:', err);
        res.status(500).json({
            status: 'error',
            message,
            stack,
        });
        return;
    }
    console.error('Unhandled error:', err);
    sendError(res, 500, 'Internal Server Error');
});
export default app;
