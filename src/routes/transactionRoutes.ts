import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';

const router = Router();
const transactionController = new TransactionController();

// POST /transactions - Execute a single transaction
router.post('/', (req, res) => transactionController.createTransaction(req, res));

// POST /transactions/bulk - Execute bulk transactions
router.post('/bulk', (req, res) => transactionController.createBulkTransactions(req, res));

export default router;
