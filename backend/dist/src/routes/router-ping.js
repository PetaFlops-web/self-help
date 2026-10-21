import { Router } from 'express';
const router = Router();
router.get('/ping', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Test Ping Server Active !!!'
    });
});
export default router;
