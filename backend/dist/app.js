import express from 'express';
import cors from 'cors';
import { HttpError } from './src/helpers/http.js';
import { sendError } from './src/middlewares/response.js';
import pingRouter from './src/routes/ping.js';
import regionsRouter from './src/routes/regions.js';
import projectsRouter from './src/routes/projects.js';
import statsRouter from './src/routes/stats.js';
import sourcesRouter from './src/routes/sources.js';
import configRouter from './src/routes/config.js';
import llmRouter from './src/routes/llm.js';
import docsRouter from './src/routes/docs.js';
import financialsRouter from './src/routes/financials.js';
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', pingRouter);
app.use('/api', regionsRouter);
app.use('/api', projectsRouter);
app.use('/api', financialsRouter);
app.use('/api', statsRouter);
app.use('/api', sourcesRouter);
app.use('/api', configRouter);
app.use('/api', llmRouter);
app.use('/', docsRouter);
app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
        sendError(res, err.status, err.message);
        return;
    }
    console.error('Unhandled error:', err);
    sendError(res, 500, 'Internal Server Error');
});
export default app;
