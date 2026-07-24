import { Response } from 'express';
import { dbQuery } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

/**
 * GET /api/notifications
 */
export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const notifications = dbQuery.all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      req.user!.id
    );
    const unreadCount = dbQuery.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
      req.user!.id
    )?.count || 0;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * PUT /api/notifications/:id/read
 */
export async function markAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    dbQuery.run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', req.params.id, req.user!.id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
}

/**
 * PUT /api/notifications/read-all
 */
export async function markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    dbQuery.run('UPDATE notifications SET read = 1 WHERE user_id = ?', req.user!.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
}

/**
 * DELETE /api/notifications/:id
 */
export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    dbQuery.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', req.params.id, req.user!.id);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}
