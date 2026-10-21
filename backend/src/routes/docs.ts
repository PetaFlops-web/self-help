import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../config/swagger.js';

const router = Router();

router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'WIA Backend API Docs',
}));

router.get('/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

export default router;
