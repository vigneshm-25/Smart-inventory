import { Router } from 'express';
import {
  getNotifications, markAsRead, markAllAsRead, deleteNotification
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate as any);

router.get('/', getNotifications as any);
router.put('/read-all', markAllAsRead as any);
router.put('/:id/read', markAsRead as any);
router.delete('/:id', deleteNotification as any);

export default router;
