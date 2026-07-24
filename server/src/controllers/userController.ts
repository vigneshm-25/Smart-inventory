import { Response } from 'express';
import { dbQuery } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

/**
 * GET /api/users
 */
export async function getUsers(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const users = dbQuery.all(`
      SELECT u.id, u.name, u.email, u.role, u.club, u.reliability_score, u.avatar_url, u.created_at,
        (SELECT COUNT(*) FROM transactions WHERE user_id = u.id AND action = 'borrow') as total_borrows,
        (SELECT COUNT(*) FROM transactions WHERE user_id = u.id AND action = 'borrow' AND actual_return_date IS NULL) as active_borrows
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * GET /api/users/:id
 */
export async function getUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = dbQuery.get(
      'SELECT id, name, email, role, club, reliability_score, avatar_url, created_at FROM users WHERE id = ?',
      req.params.id
    );
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const recentTransactions = dbQuery.all(`
      SELECT t.*, i.name as item_name FROM transactions t
      JOIN items i ON t.item_id = i.id WHERE t.user_id = ?
      ORDER BY t.timestamp DESC LIMIT 10
    `, req.params.id);

    res.json({ user, recentTransactions });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/**
 * PUT /api/users/:id/role
 */
export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    dbQuery.run('UPDATE users SET role = ? WHERE id = ?', role, req.params.id);
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
}
