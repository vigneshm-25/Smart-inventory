import { Router } from 'express';
import {
  getItems, getItem, createItem, updateItem, deleteItem,
  getCategories, getClubs
} from '../controllers/itemController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// Read routes (all authenticated users)
router.get('/', getItems as any);
router.get('/categories/list', getCategories as any);
router.get('/clubs/list', getClubs as any);
router.get('/:id', getItem as any);

// Write routes (admin only)
router.post('/', authorize('admin') as any, createItem as any);
router.put('/:id', authorize('admin') as any, updateItem as any);
router.delete('/:id', authorize('admin') as any, deleteItem as any);

export default router;
