import { Router } from 'express';
import { 
    registerDevice, 
    createAuditLog, 
    updateAuditLogEnd, 
    getAuditLogs, 
    getLiveDevices 
} from '../controllers/live.controller';

const router = Router();

// Device endpoints
router.post('/device/register', registerDevice);
router.get('/devices/live', getLiveDevices);

// Audit endpoints (Admin Only)
router.post('/audit/start', createAuditLog);
router.patch('/audit/stop/:logId', updateAuditLogEnd);
router.get('/audit/logs', getAuditLogs);

export default router;
