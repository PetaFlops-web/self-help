import { Router } from 'express';
import { listSources } from '../controllers/sources.js';

const router = Router();

router.get('/sources', listSources);

export default router;
