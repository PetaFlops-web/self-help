import { Router } from 'express';
import { getRegions } from '../controllers/regions.js';
const router = Router();
router.get('/regions', getRegions);
export default router;
