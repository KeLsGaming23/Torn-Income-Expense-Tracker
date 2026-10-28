import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController.js';

const router = Router();

router.get('/', InventoryController.getInventory);
router.post('/batch', InventoryController.addBatch);
router.delete('/batch/:id', InventoryController.deleteBatch);
router.get('/deductions', InventoryController.getDeductions);
router.get('/catalog', InventoryController.getCatalog);

export default router;
