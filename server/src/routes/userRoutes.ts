import { Router } from 'express';
import { getUsers, getUser, updateUserRole } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All user management routes require admin access
router.use(authenticate as any, authorize('admin') as any);

router.get('/', getUsers as any);
router.get('/:id', getUser as any);
router.put('/:id/role', updateUserRole as any);

export default router;
