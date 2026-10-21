import { Router } from 'express';
import { generate } from '../controllers/internal.js';

const router = Router();

router.post('/generate', generate);

export default router;
