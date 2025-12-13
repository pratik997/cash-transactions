import { Router } from 'express';
import { UserController } from '../controllers/UserController';

const router = Router();
const userController = new UserController();

// POST /users - Create a new user
router.post('/', (req, res) => userController.createUser(req, res));

// GET /users/:userId/amount - Get user balance
router.get('/:userId/amount', (req, res) => userController.getAmount(req, res));

export default router;
