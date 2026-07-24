import { Router } from 'express';
import { register, login, getProfile, refreshToken } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', register as any);
router.post('/login', login as any);

// Protected routes
router.get('/me', authenticate as any, getProfile as any);
router.post('/refresh', authenticate as any, refreshToken as any);

export default router;
