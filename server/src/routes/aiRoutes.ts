import { Router } from 'express';
import { handleAIQuery, planEvent, reservePlan, getReport } from '../controllers/aiController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All AI routes require authentication & admin privileges
router.use(authenticate as any);
router.use(authorize('admin') as any);

router.post('/query', handleAIQuery as any);
router.post('/plan-event', planEvent as any);
router.post('/reserve-plan', reservePlan as any);
router.get('/report', getReport as any);

export default router;
