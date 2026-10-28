import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';

const router = Router();

router.get('/dashboard', AnalyticsController.getDashboardOverview);
router.get('/trends', AnalyticsController.getTrends);
router.get('/breakdown', AnalyticsController.getBreakdown);
router.get('/museum-comparison', AnalyticsController.getMuseumComparison);

export default router;
