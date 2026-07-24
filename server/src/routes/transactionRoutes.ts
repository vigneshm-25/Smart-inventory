import { Router } from 'express';
import {
  borrowItem, returnItem, getAllTransactions,
  getMyTransactions, getActiveBorrows
} from '../controllers/transactionController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// Member routes
router.post('/borrow', borrowItem as any);
router.post('/return', returnItem as any);
router.get('/my', getMyTransactions as any);
router.get('/active', getActiveBorrows as any);

// Admin routes
router.get('/', authorize('admin') as any, getAllTransactions as any);

export default router;
