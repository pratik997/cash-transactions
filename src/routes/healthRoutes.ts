import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

const router = Router();
const healthController = new HealthController();

// GET /health - Health check
router.get('/', (req, res) => healthController.check(req, res));

export default router;
