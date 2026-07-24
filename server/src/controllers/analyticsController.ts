import { Response } from 'express';
import { dbQuery } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

/**
 * GET /api/analytics/summary
 */
export async function getSummary(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const totalItems = dbQuery.get('SELECT COUNT(*) as count FROM items')?.count || 0;
    const available = dbQuery.get("SELECT COUNT(*) as count FROM items WHERE status = 'available'")?.count || 0;
    const borrowed = dbQuery.get("SELECT COUNT(*) as count FROM items WHERE status = 'borrowed'")?.count || 0;
    const overdue = dbQuery.get(`
      SELECT COUNT(DISTINCT t.item_id) as count
      FROM transactions t
      WHERE t.action = 'borrow' 
        AND t.actual_return_date IS NULL
        AND t.expected_return_date < datetime('now')
    `)?.count || 0;
    const totalUsers = dbQuery.get('SELECT COUNT(*) as count FROM users')?.count || 0;
    const totalTransactions = dbQuery.get('SELECT COUNT(*) as count FROM transactions')?.count || 0;
    const maintenance = dbQuery.get("SELECT COUNT(*) as count FROM items WHERE status = 'maintenance'")?.count || 0;
    const lost = dbQuery.get("SELECT COUNT(*) as count FROM items WHERE status = 'lost'")?.count || 0;

    res.json({
      summary: { totalItems, available, borrowed, overdue, totalUsers, totalTransactions, maintenance, lost },
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
}

/**
 * GET /api/analytics/borrow-trend
 */
export async function getBorrowTrend(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const trend = dbQuery.all(`
      SELECT 
        DATE(timestamp) as date,
        SUM(CASE WHEN action = 'borrow' THEN 1 ELSE 0 END) as borrows,
        SUM(CASE WHEN action = 'return' THEN 1 ELSE 0 END) as returns
      FROM transactions
      WHERE timestamp >= datetime('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

    // Fill in missing dates with zeros
    const result = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const existing = trend.find((t: any) => t.date === dateStr) as any;
      result.push({
        date: dateStr,
        borrows: existing?.borrows || 0,
        returns: existing?.returns || 0,
      });
    }

    res.json({ trend: result });
  } catch (error) {
    console.error('Get borrow trend error:', error);
    res.status(500).json({ error: 'Failed to fetch borrow trend' });
  }
}

/**
 * GET /api/analytics/category-distribution
 */
export async function getCategoryDistribution(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const distribution = dbQuery.all(`
      SELECT category, COUNT(*) as count,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'borrowed' THEN 1 ELSE 0 END) as borrowed
      FROM items
      GROUP BY category
      ORDER BY count DESC
    `);
    res.json({ distribution });
  } catch (error) {
    console.error('Get category distribution error:', error);
    res.status(500).json({ error: 'Failed to fetch category distribution' });
  }
}

/**
 * GET /api/analytics/top-borrowed
 */
export async function getTopBorrowed(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const topBorrowed = dbQuery.all(`
      SELECT i.id, i.name, i.category, i.image_url, COUNT(t.id) as borrow_count
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      WHERE t.action = 'borrow'
      GROUP BY i.id
      ORDER BY borrow_count DESC
      LIMIT 10
    `);
    res.json({ topBorrowed });
  } catch (error) {
    console.error('Get top borrowed error:', error);
    res.status(500).json({ error: 'Failed to fetch top borrowed items' });
  }
}

/**
 * GET /api/analytics/club-usage
 */
export async function getClubUsage(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const usage = dbQuery.all(`
      SELECT i.owning_club as club, 
        COUNT(t.id) as total_transactions,
        SUM(CASE WHEN t.action = 'borrow' THEN 1 ELSE 0 END) as borrows,
        SUM(CASE WHEN t.action = 'return' THEN 1 ELSE 0 END) as returns
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      GROUP BY i.owning_club
      ORDER BY total_transactions DESC
    `);
    res.json({ usage });
  } catch (error) {
    console.error('Get club usage error:', error);
    res.status(500).json({ error: 'Failed to fetch club usage' });
  }
}

/**
 * GET /api/analytics/recent-activity
 */
export async function getRecentActivity(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const activity = dbQuery.all(`
      SELECT t.id, t.action, t.timestamp, t.notes,
        i.name as item_name, i.category as item_category, i.image_url as item_image,
        u.name as user_name, u.avatar_url as user_avatar
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      JOIN users u ON t.user_id = u.id
      ORDER BY t.timestamp DESC
      LIMIT 20
    `);
    res.json({ activity });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
}
