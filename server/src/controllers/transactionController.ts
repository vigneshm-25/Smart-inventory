import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { dbQuery } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { socketEvents } from '../websocket/socketHandler.js';

// ── Validation Schemas ──────────────────────────────────────────────

const borrowSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  expectedReturnDate: z.string().min(1, 'Expected return date is required'),
  notes: z.string().optional(),
});

const returnSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  notes: z.string().optional(),
});

// ── Controllers ─────────────────────────────────────────────────────

/**
 * POST /api/transactions/borrow
 * Borrow an item. Validates availability and prevents duplicate borrows.
 */
export async function borrowItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = borrowSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { itemId, expectedReturnDate, notes } = validation.data;

    // Check item exists and is available
    const item = dbQuery.get('SELECT * FROM items WHERE id = ? OR qr_code_id = ?', itemId, itemId);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    if (item.status !== 'available') {
      res.status(409).json({ error: `Item is currently ${item.status}` });
      return;
    }

    // Check for duplicate active borrow by this user
    const activeBorrow = dbQuery.get(
      `SELECT id FROM transactions 
       WHERE user_id = ? AND item_id = ? AND action = 'borrow' AND actual_return_date IS NULL`,
      req.user!.id, item.id
    );

    if (activeBorrow) {
      res.status(409).json({ error: 'You already have this item borrowed' });
      return;
    }

    const transactionId = uuidv4();

    // Use a transaction for atomicity
    dbQuery.transaction(() => {
      // Create borrow transaction
      dbQuery.run(
        `INSERT INTO transactions (id, item_id, user_id, action, expected_return_date, notes)
         VALUES (?, ?, ?, 'borrow', ?, ?)`,
        transactionId, item.id, req.user!.id, expectedReturnDate, notes || null
      );

      // Update item status
      dbQuery.run("UPDATE items SET status = 'borrowed' WHERE id = ?", item.id);

      // Create notification for the user
      dbQuery.run(
        `INSERT INTO notifications (id, user_id, title, message, type)
         VALUES (?, ?, ?, ?, 'success')`,
        uuidv4(), req.user!.id, 'Item Borrowed',
        `You borrowed "${item.name}". Please return by ${new Date(expectedReturnDate).toLocaleDateString()}.`
      );
    });

    const user = dbQuery.get('SELECT name FROM users WHERE id = ?', req.user!.id);
    const userName = user?.name || 'Member';

    // Broadcast real-time Socket.io event for admin dashboard
    socketEvents.itemBorrowed({ itemId: item.id, itemName: item.name, userName });

    const transaction = dbQuery.get(`
      SELECT t.*, i.name as item_name, u.name as user_name
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, transactionId);

    res.status(201).json({
      message: 'Item borrowed successfully',
      transaction,
    });
  } catch (error: any) {
    console.error('Borrow error:', error);
    res.status(500).json({ error: error?.message || 'Failed to borrow item' });
  }
}

/**
 * POST /api/transactions/return
 * Return a borrowed item.
 */
export async function returnItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = returnSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { itemId, notes } = validation.data;

    // Check item exists
    const item = dbQuery.get('SELECT * FROM items WHERE id = ? OR qr_code_id = ?', itemId, itemId);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // Find active borrow transaction for this user
    const activeBorrow = dbQuery.get(`
      SELECT * FROM transactions 
      WHERE user_id = ? AND item_id = ? AND action = 'borrow' AND actual_return_date IS NULL
      ORDER BY timestamp DESC LIMIT 1
    `, req.user!.id, item.id);

    if (!activeBorrow) {
      res.status(404).json({ error: 'No active borrow found for this item' });
      return;
    }

    const now = new Date().toISOString();
    const isOverdue = activeBorrow.expected_return_date && new Date(activeBorrow.expected_return_date) < new Date();

    dbQuery.transaction(() => {
      // Update borrow transaction with return date
      dbQuery.run('UPDATE transactions SET actual_return_date = ? WHERE id = ?', now, activeBorrow.id);

      // Create return transaction record
      dbQuery.run(
        `INSERT INTO transactions (id, item_id, user_id, action, notes)
         VALUES (?, ?, ?, 'return', ?)`,
        uuidv4(), item.id, req.user!.id, notes || null
      );

      // Update item status to available
      dbQuery.run("UPDATE items SET status = 'available' WHERE id = ?", item.id);

      // Adjust reliability score
      if (isOverdue) {
        dbQuery.run('UPDATE users SET reliability_score = MAX(0, reliability_score - 5) WHERE id = ?', req.user!.id);
      } else {
        dbQuery.run('UPDATE users SET reliability_score = MIN(100, reliability_score + 1) WHERE id = ?', req.user!.id);
      }

      // Create notification
      dbQuery.run(
        `INSERT INTO notifications (id, user_id, title, message, type)
         VALUES (?, ?, ?, ?, ?)`,
        uuidv4(), req.user!.id, 'Item Returned',
        `You returned "${item.name}".${isOverdue ? ' Note: This item was overdue.' : ' Thank you for the timely return!'}`,
        isOverdue ? 'warning' : 'success'
      );
    });

    const user = dbQuery.get('SELECT name FROM users WHERE id = ?', req.user!.id);
    const userName = user?.name || 'Member';

    // Broadcast real-time Socket.io event for admin dashboard
    socketEvents.itemReturned({ itemId: item.id, itemName: item.name, userName });

    res.json({ message: 'Item returned successfully', wasOverdue: isOverdue });
  } catch (error) {
    console.error('Return error:', error);
    res.status(500).json({ error: 'Failed to return item' });
  }
}

/**
 * GET /api/transactions/my
 * Get current user's transaction history.
 */
export async function getMyTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const transactions = dbQuery.all(`
      SELECT t.*, i.name as item_name, i.category as item_category, i.image_url as item_image, i.status as item_status
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      WHERE t.user_id = ?
      ORDER BY t.timestamp DESC
    `, req.user!.id);

    res.json({ transactions });
  } catch (error) {
    console.error('Get my transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

/**
 * GET /api/transactions/active
 * Get current user's active borrows.
 */
export async function getActiveBorrows(req: AuthRequest, res: Response): Promise<void> {
  try {
    const borrows = dbQuery.all(`
      SELECT t.*, i.name as item_name, i.category as item_category, i.image_url as item_image, i.storage_location
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      WHERE t.user_id = ? AND t.action = 'borrow' AND t.actual_return_date IS NULL
      ORDER BY t.timestamp DESC
    `, req.user!.id);

    res.json({ borrows });
  } catch (error) {
    console.error('Get active borrows error:', error);
    res.status(500).json({ error: 'Failed to fetch active borrows' });
  }
}

/**
 * GET /api/transactions
 * List all transactions (admin only).
 */
export async function getAllTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { action, search, limit = '50', offset = '0' } = req.query;

    let query = `
      SELECT t.*, i.name as item_name, i.category as item_category, u.name as user_name, u.email as user_email
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (action) {
      query += ' AND t.action = ?';
      params.push(action);
    }
    if (search) {
      query += ' AND (i.name LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY t.timestamp DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const transactions = dbQuery.all(query, ...params);
    res.json({ transactions });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}
