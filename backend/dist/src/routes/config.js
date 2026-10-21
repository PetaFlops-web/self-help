import { Router } from 'express';
import { getScoringConfig } from '../controllers/config.js';
const router = Router();
router.get('/config/scoring', getScoringConfig);
export default router;
