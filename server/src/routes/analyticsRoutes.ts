import { Router } from 'express';
import {
  getSummary, getBorrowTrend, getCategoryDistribution,
  getTopBorrowed, getClubUsage, getRecentActivity
} from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All analytics require admin access
router.use(authenticate as any);

router.get('/summary', getSummary as any);
router.get('/borrow-trend', getBorrowTrend as any);
router.get('/category-distribution', getCategoryDistribution as any);
router.get('/top-borrowed', getTopBorrowed as any);
router.get('/club-usage', getClubUsage as any);
router.get('/recent-activity', getRecentActivity as any);

export default router;
