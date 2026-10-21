import express from 'express';
import type { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { HttpError } from './src/helpers/http.js';
import pingRouter from './src/routes/ping.js';
import internalRouter from './src/routes/internal.js';

const app: Application = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/', pingRouter);
app.use('/internal', internalRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }
  if (err instanceof SyntaxError && 'body' in (err as object)) {
    res.status(400).json({ success: false, message: 'Body JSON tidak valid' });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

export default app;
