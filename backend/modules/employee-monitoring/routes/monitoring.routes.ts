import { Router } from 'express';
import { syncActivity, uploadScreenshot, getStats, getScreenshots, getAlerts } from '../controllers/monitoring.controller';

const router = Router();

// Agent sync heartbeats (every 60s)
router.post('/sync', syncActivity);

// Agent screenshot upload (every 5m)
router.post('/screenshots', uploadScreenshot);

// Dashboard data endpoints
router.get('/stats', getStats);
router.get('/screenshots', getScreenshots);
router.get('/alerts', getAlerts);

export default router;
