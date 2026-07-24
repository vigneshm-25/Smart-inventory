import { Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { callAIService } from '../services/aiService.js';
import { socketEvents } from '../websocket/socketHandler.js';

// ── Validation Schemas ──────────────────────────────────────────────

const querySchema = z.object({
  question: z.string().min(2, 'Question is required'),
});

const planEventSchema = z.object({
  eventDescription: z.string().min(3, 'Event description is required'),
});

const reservePlanSchema = z.object({
  itemIds: z.array(z.string()).min(1, 'Item IDs are required'),
  notes: z.string().optional(),
});

// ── Controllers ─────────────────────────────────────────────────────

/**
 * POST /api/ai/query
 * Feature 1: AI Inventory Assistant
 */
export async function handleAIQuery(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = querySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { question } = validation.data;

    // 1. Fetch relevant summary data from DB (grounding)
    const summary = dbQuery.get(`
      SELECT 
        (SELECT COUNT(*) FROM items) as total_items,
        (SELECT COUNT(*) FROM items WHERE status = 'available') as available_items,
        (SELECT COUNT(*) FROM items WHERE status = 'borrowed') as borrowed_items,
        (SELECT COUNT(*) FROM items WHERE status = 'maintenance') as maintenance_items,
        (SELECT COUNT(*) FROM transactions WHERE action = 'borrow' AND actual_return_date IS NULL AND datetime(expected_return_date) < datetime('now')) as overdue_items
    `);

    const overdueList = dbQuery.all(`
      SELECT i.name as item_name, i.qr_code_id, u.name as user_name, t.expected_return_date
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      JOIN users u ON t.user_id = u.id
      WHERE t.action = 'borrow' AND t.actual_return_date IS NULL AND datetime(t.expected_return_date) < datetime('now')
    `);

    const activeLoans = dbQuery.all(`
      SELECT i.name as item_name, i.qr_code_id, i.category, u.name as user_name, u.email as user_email, t.timestamp as borrowed_at, t.expected_return_date
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      JOIN users u ON t.user_id = u.id
      WHERE t.action = 'borrow' AND t.actual_return_date IS NULL
      ORDER BY t.timestamp DESC
    `);

    const recentBorrowHistory = dbQuery.all(`
      SELECT i.name as item_name, i.qr_code_id, i.category, u.name as user_name, u.email as user_email, t.timestamp as borrowed_at, t.expected_return_date, t.actual_return_date,
        (CASE WHEN t.actual_return_date IS NULL THEN 'active' ELSE 'returned' END) as loan_status
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      JOIN users u ON t.user_id = u.id
      WHERE t.action = 'borrow'
      ORDER BY t.timestamp DESC
      LIMIT 100
    `);

    const topBorrowed = dbQuery.all(`
      SELECT i.name, i.category, COUNT(t.id) as borrow_count
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      WHERE t.action = 'borrow'
      GROUP BY t.item_id
      ORDER BY borrow_count DESC LIMIT 5
    `);

    const contextData = {
      summary,
      overdueList: overdueList.map((o: any) => `${o.item_name} (${o.qr_code_id}) held by ${o.user_name}, due: ${o.expected_return_date}`),
      activeLoans: activeLoans.map((a: any) => `${a.item_name} (${a.qr_code_id}) currently held by ${a.user_name} (${a.user_email}), borrowed on ${a.borrowed_at}, due: ${a.expected_return_date}`),
      recentBorrowHistory: recentBorrowHistory.map((h: any) => `${h.item_name} (${h.qr_code_id}) ${h.loan_status === 'active' ? 'currently borrowed' : 'previously borrowed'} by ${h.user_name} (${h.user_email}) on ${h.borrowed_at}${h.actual_return_date ? ', returned on ' + h.actual_return_date : ''}`),
      topBorrowedItems: topBorrowed.map((b: any) => `${b.name} (${b.category}): ${b.borrow_count} borrows`),
    };

    const systemPrompt = `You are Smart Inventory AI's data-grounded equipment assistant for college organizations. Answer concisely (2-4 sentences) based ONLY on this database context:
Context: ${JSON.stringify(contextData)}
Note: topBorrowedItems only contains aggregate counts with no borrower names. Use activeLoans and recentBorrowHistory to answer questions about who currently has or who previously borrowed specific items or categories. If asked about overdue items, list them specifically. Be helpful, professional, and precise.`;

    const answer = await callAIService({
      systemPrompt,
      userPrompt: question,
      maxTokens: 400,
    });

    res.json({ question, answer });
  } catch (error: any) {
    console.error('AI Query Error:', error);
    res.status(500).json({ error: error?.message || 'Failed to process AI query' });
  }
}

/**
 * POST /api/ai/plan-event
 * Feature 2: Intelligent Equipment Requirement Planner
 */
export async function planEvent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = planEventSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { eventDescription } = validation.data;

    // Get list of existing categories in DB
    const dbCategories = dbQuery.all('SELECT DISTINCT category FROM items').map((c: any) => c.category);

    const systemPrompt = `You are an expert equipment logistics planner for university events.
Analyze the event description and return a JSON object with key "recommendations" containing an array of items needed.
Available categories in database: ${JSON.stringify(dbCategories)}.
Format:
{
  "recommendations": [
    {
      "item_category": "Category Name",
      "recommended_quantity": 2,
      "reason": "Reason for recommendation"
    }
  ]
}`;

    const rawResponse = await callAIService({
      systemPrompt,
      userPrompt: eventDescription,
      jsonMode: true,
      maxTokens: 600,
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      parsed = { recommendations: [] };
    }

    const recommendations = parsed.recommendations || [];

    // Cross-check recommendations against DB items
    const plan = recommendations.map((rec: any) => {
      const category = rec.item_category;
      const recQty = rec.recommended_quantity || 1;

      // Find available items in matching category
      const availableItems = dbQuery.all(
        `SELECT id, name, category, qr_code_id, storage_location, condition 
         FROM items 
         WHERE LOWER(category) = LOWER(?) AND status = 'available'`,
        category
      );

      const availableCount = availableItems.length;

      let status = 'Available';
      let shortageCount = 0;
      let assignedItems: any[] = [];
      let substitute: any = null;

      if (availableCount >= recQty) {
        status = 'Available';
        assignedItems = availableItems.slice(0, recQty);
      } else if (availableCount > 0) {
        status = 'Shortage';
        shortageCount = recQty - availableCount;
        assignedItems = availableItems;
      } else {
        status = 'Shortage';
        shortageCount = recQty;

        // Check for alternative category with available stock
        const altCategory = dbQuery.get(
          `SELECT category, COUNT(*) as count 
           FROM items 
           WHERE status = 'available' AND LOWER(category) != LOWER(?) 
           GROUP BY category ORDER BY count DESC LIMIT 1`,
          category
        );

        if (altCategory) {
          substitute = {
            category: altCategory.category,
            availableCount: altCategory.count,
            note: `Consider substituting with ${altCategory.category} (${altCategory.count} available)`
          };
          status = 'Substitute Suggested';
        }
      }

      return {
        category,
        recommendedQuantity: recQty,
        reason: rec.reason || 'Required for event',
        status,
        availableCount,
        shortageCount,
        assignedItems,
        substitute,
      };
    });

    res.json({
      eventDescription,
      plan,
    });
  } catch (error: any) {
    console.error('Plan event error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate event plan' });
  }
}

/**
 * POST /api/ai/reserve-plan
 * Reserve all available recommended items from an event plan.
 */
export async function reservePlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = reservePlanSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { itemIds, notes } = validation.data;
    const reservedItems: string[] = [];
    const expectedReturnDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    dbQuery.transaction(() => {
      for (const itemId of itemIds) {
        const item = dbQuery.get('SELECT * FROM items WHERE id = ? AND status = "available"', itemId);
        if (item) {
          const transactionId = uuidv4();
          dbQuery.run(
            `INSERT INTO transactions (id, item_id, user_id, action, expected_return_date, notes)
             VALUES (?, ?, ?, 'borrow', ?, ?)`,
            transactionId, item.id, req.user!.id, expectedReturnDate, notes || 'Reserved via AI Equipment Planner'
          );
          dbQuery.run("UPDATE items SET status = 'reserved' WHERE id = ?", item.id);
          reservedItems.push(item.name);

          // Emit Socket.io update
          socketEvents.itemUpdated({ itemId: item.id, changes: { status: 'reserved' } });
        }
      }
    });

    res.json({
      message: `Successfully reserved ${reservedItems.length} equipment items`,
      reservedItems,
      count: reservedItems.length,
    });
  } catch (error: any) {
    console.error('Reserve plan error:', error);
    res.status(500).json({ error: error?.message || 'Failed to reserve plan equipment' });
  }
}

/**
 * GET /api/ai/report
 * Feature 3: AI Report Generator
 */
export async function getReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const period = (req.query.period as string) || 'weekly';

    let daysAgo = 7;
    if (period === 'daily') daysAgo = 1;
    if (period === 'monthly') daysAgo = 30;

    const startDate = new Date(Date.now() - daysAgo * 86400000).toISOString();

    // Compute period statistics
    const statsQuery = dbQuery.get(`
      SELECT
        (SELECT COUNT(*) FROM transactions WHERE action = 'borrow' AND timestamp >= ?) as period_borrows,
        (SELECT COUNT(*) FROM transactions WHERE action = 'return' AND timestamp >= ?) as period_returns,
        (SELECT COUNT(*) FROM transactions WHERE action = 'borrow' AND actual_return_date IS NULL AND datetime(expected_return_date) < datetime('now')) as active_overdue
    `, startDate, startDate);

    const topBorrowed = dbQuery.all(`
      SELECT i.name, i.category, i.qr_code_id, COUNT(t.id) as borrow_count
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      WHERE t.action = 'borrow' AND t.timestamp >= ?
      GROUP BY t.item_id
      ORDER BY borrow_count DESC LIMIT 5
    `, startDate);

    const leastBorrowed = dbQuery.all(`
      SELECT i.name, i.category, i.qr_code_id, COALESCE(COUNT(t.id), 0) as borrow_count
      FROM items i
      LEFT JOIN transactions t ON i.id = t.item_id AND t.action = 'borrow' AND t.timestamp >= ?
      GROUP BY i.id
      ORDER BY borrow_count ASC LIMIT 5
    `, startDate);

    const clubUsage = dbQuery.all(`
      SELECT i.owning_club as club, COUNT(t.id) as total_borrows
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      WHERE t.action = 'borrow' AND t.timestamp >= ?
      GROUP BY i.owning_club
      ORDER BY total_borrows DESC
    `, startDate);

    const overdueBreakdown = dbQuery.all(`
      SELECT i.name, i.qr_code_id, u.name as borrower, t.expected_return_date
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      JOIN users u ON t.user_id = u.id
      WHERE t.action = 'borrow' AND t.actual_return_date IS NULL AND datetime(t.expected_return_date) < datetime('now')
    `);

    const summaryContext = {
      period,
      borrows: statsQuery.period_borrows,
      returns: statsQuery.period_returns,
      overdueCount: statsQuery.active_overdue,
      topBorrowed: topBorrowed.map((b: any) => `${b.name} (${b.borrow_count} borrows)`),
      leastBorrowed: leastBorrowed.map((l: any) => `${l.name} (${l.borrow_count} borrows)`),
      clubUsage: clubUsage.map((c: any) => `${c.club}: ${c.total_borrows} borrows`),
    };

    const systemPrompt = `You are an executive inventory strategist for a university campus.
Generate a concise 2-3 paragraph executive summary for the ${period} inventory report.
Highlight key borrow volume, overdue issues, and top/least used items.
Include 1-2 actionable recommendations (e.g. purchasing more high-demand items or reallocating unused items).
Data: ${JSON.stringify(summaryContext)}`;

    const executiveSummary = await callAIService({
      systemPrompt,
      userPrompt: `Generate the ${period} executive summary report.`,
      maxTokens: 500,
    });

    res.json({
      period,
      stats: {
        totalBorrows: statsQuery.period_borrows,
        totalReturns: statsQuery.period_returns,
        activeOverdue: statsQuery.active_overdue,
        topBorrowed,
        leastBorrowed,
        clubUsage,
        overdueBreakdown,
      },
      executiveSummary,
    });
  } catch (error: any) {
    console.error('Get report error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate report' });
  }
}
