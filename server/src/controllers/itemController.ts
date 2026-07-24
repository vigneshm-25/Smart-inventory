import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { dbQuery } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// ── Validation Schemas ──────────────────────────────────────────────

const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  owningClub: z.string().min(1, 'Owning club is required'),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).default('good'),
  quantity: z.number().int().positive().default(1),
  storageLocation: z.string().optional(),
});

const updateItemSchema = createItemSchema.partial().extend({
  status: z.enum(['available', 'borrowed', 'reserved', 'maintenance', 'lost']).optional(),
});

// ── Controllers ─────────────────────────────────────────────────────

/**
 * GET /api/items
 * List all items with optional search & filters.
 */
export async function getItems(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, category, club, search } = req.query;

    let query = `
      SELECT i.*, 
        (SELECT u.name FROM transactions t 
         JOIN users u ON t.user_id = u.id 
         WHERE t.item_id = i.id AND t.action = 'borrow' 
         AND t.actual_return_date IS NULL 
         ORDER BY t.timestamp DESC LIMIT 1) as current_holder,
        (SELECT t.expected_return_date FROM transactions t 
         WHERE t.item_id = i.id AND t.action = 'borrow' 
         AND t.actual_return_date IS NULL 
         ORDER BY t.timestamp DESC LIMIT 1) as return_date
      FROM items i WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND i.category = ?';
      params.push(category);
    }
    if (club) {
      query += ' AND i.owning_club = ?';
      params.push(club);
    }
    if (search) {
      query += ' AND (i.name LIKE ? OR i.description LIKE ? OR i.category LIKE ? OR i.qr_code_id LIKE ? OR i.id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY i.created_at DESC';

    const items = dbQuery.all(query, ...params);
    res.json({ items });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
}

/**
 * GET /api/items/:id
 * Get single item by ID or Item Code (e.g. ITM-001).
 */
export async function getItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const lookupId = req.params.id;
    const item = dbQuery.get(`
      SELECT i.*, 
        (SELECT u.name FROM transactions t 
         JOIN users u ON t.user_id = u.id 
         WHERE t.item_id = i.id AND t.action = 'borrow' 
         AND t.actual_return_date IS NULL 
         ORDER BY t.timestamp DESC LIMIT 1) as current_holder,
        (SELECT u.id FROM transactions t 
         JOIN users u ON t.user_id = u.id 
         WHERE t.item_id = i.id AND t.action = 'borrow' 
         AND t.actual_return_date IS NULL 
         ORDER BY t.timestamp DESC LIMIT 1) as current_holder_id,
        (SELECT t.expected_return_date FROM transactions t 
         WHERE t.item_id = i.id AND t.action = 'borrow' 
         AND t.actual_return_date IS NULL 
         ORDER BY t.timestamp DESC LIMIT 1) as return_date
      FROM items i 
      WHERE i.id = ? OR UPPER(i.qr_code_id) = UPPER(?) OR UPPER(i.qr_code_id) = UPPER(?)
    `, lookupId, lookupId, `ITM-${String(lookupId).padStart(3, '0')}`);

    if (!item) {
      res.status(404).json({ error: `Item "${lookupId}" not found` });
      return;
    }

    res.json({ item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
}

/**
 * POST /api/items
 * Create a new inventory item (admin only).
 * Automatically generates a human-readable Item ID (e.g. ITM-016).
 */
export async function createItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = createItemSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { name, category, description, owningClub, condition, quantity, storageLocation } = validation.data;

    const id = uuidv4();

    // Auto-generate human-readable Item ID (e.g., ITM-016)
    const countRow = dbQuery.get('SELECT COUNT(*) as count FROM items');
    const nextNum = (countRow?.count || 0) + 1;
    const itemCode = `ITM-${String(nextNum).padStart(3, '0')}`;

    dbQuery.run(
      `INSERT INTO items (id, name, category, description, owning_club, condition, status, quantity, storage_location, qr_code_id, image_url)
       VALUES (?, ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?)`,
      id, name, category, description || null, owningClub, condition, quantity, storageLocation || null, itemCode, req.body.imageUrl || null
    );

    const item = dbQuery.get('SELECT * FROM items WHERE id = ?', id);

    console.log(`✅ Created item "${name}" with ID: ${itemCode}`);

    res.status(201).json({
      message: 'Item created successfully',
      item,
      itemId: itemCode,
    });
  } catch (error: any) {
    console.error('Create item error:', error);
    res.status(500).json({ error: error?.message || 'Failed to create item' });
  }
}

/**
 * PUT /api/items/:id
 * Update an existing item (admin only).
 */
export async function updateItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = updateItemSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const existing = dbQuery.get('SELECT * FROM items WHERE id = ?', req.params.id);

    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const data = validation.data;
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.category !== undefined) { updates.push('category = ?'); params.push(data.category); }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
    if (data.owningClub !== undefined) { updates.push('owning_club = ?'); params.push(data.owningClub); }
    if (data.condition !== undefined) { updates.push('condition = ?'); params.push(data.condition); }
    if (data.status !== undefined) { updates.push('status = ?'); params.push(data.status); }
    if (data.quantity !== undefined) { updates.push('quantity = ?'); params.push(data.quantity); }
    if (data.storageLocation !== undefined) { updates.push('storage_location = ?'); params.push(data.storageLocation); }
    if (req.body.imageUrl !== undefined) { updates.push('image_url = ?'); params.push(req.body.imageUrl); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    params.push(req.params.id);
    dbQuery.run(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`, ...params);

    const item = dbQuery.get('SELECT * FROM items WHERE id = ?', req.params.id);
    res.json({ message: 'Item updated successfully', item });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
}

/**
 * DELETE /api/items/:id
 * Delete an item (admin only).
 */
export async function deleteItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const existing = dbQuery.get('SELECT * FROM items WHERE id = ?', req.params.id);

    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    dbQuery.run('DELETE FROM items WHERE id = ?', req.params.id);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
}

/**
 * GET /api/items/categories/list
 */
export async function getCategories(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const categories = dbQuery.all('SELECT DISTINCT category FROM items ORDER BY category');
    res.json({ categories: categories.map((c: any) => c.category) });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

/**
 * GET /api/items/clubs/list
 */
export async function getClubs(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const clubs = dbQuery.all('SELECT DISTINCT owning_club FROM items ORDER BY owning_club');
    res.json({ clubs: clubs.map((c: any) => c.owning_club) });
  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({ error: 'Failed to fetch clubs' });
  }
}
