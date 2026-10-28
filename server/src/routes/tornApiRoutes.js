import { Router } from 'express';
import { TornApiController } from '../controllers/tornApiController.js';

const router = Router();

router.get('/status', TornApiController.getStatus);
router.post('/sync', TornApiController.triggerSync);
router.post('/settings', TornApiController.updateSettings);

export default router;
