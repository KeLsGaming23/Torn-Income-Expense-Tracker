import { Router } from 'express';
import { MuseumController } from '../controllers/museumController.js';

const router = Router();

router.get('/sets', MuseumController.getSets);
router.post('/convert', MuseumController.convertSets);
router.get('/conversions', MuseumController.getConversions);
router.post('/sell-points', MuseumController.sellPoints);
router.get('/point-ledger', MuseumController.getPointLedger);

export default router;
