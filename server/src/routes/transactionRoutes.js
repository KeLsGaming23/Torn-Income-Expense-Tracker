import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController.js';

const router = Router();

router.get('/', TransactionController.getTransactions);
router.post('/', TransactionController.createTransaction);
router.put('/:id', TransactionController.updateTransaction);
router.delete('/:id', TransactionController.deleteTransaction);
router.get('/categories', TransactionController.getCategories);

export default router;
