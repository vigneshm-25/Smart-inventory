// @ts-ignore
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { config } from './env.js';

let db: SqlJsDatabase | null = null;
let dbPath: string;

/**
 * Initialize and return the SQLite database connection using sql.js (pure JS).
 * Creates the data directory if it doesn't exist.
 */
export async function initDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  dbPath = path.resolve(config.database.path);
  const dbDir = path.dirname(dbPath);

  // Ensure the data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  console.log(`📦 Database connected: ${dbPath}`);
  return db;
}

/**
 * Get the database instance (must be initialized first).
 */
export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Save the database to disk.
 * Call this after write operations to persist changes.
 */
export function saveDatabase(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

/**
 * Close the database connection gracefully.
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('📦 Database connection closed');
  }
}

// ── Helper wrapper for better-sqlite3-like API ──────────────────────

/**
 * Provides a simplified query interface that mimics better-sqlite3's API.
 * This makes it easier to use throughout the codebase.
 */
export const dbQuery = {
  /** Run a query that modifies data (INSERT, UPDATE, DELETE) */
  run(sql: string, ...params: any[]): void {
    const database = getDatabase();
    database.run(sql, params);
    saveDatabase();
  },

  /** Get a single row */
  get(sql: string, ...params: any[]): any {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    stmt.bind(params);
    
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      stmt.free();
      
      const row: any = {};
      columns.forEach((col: string, i: number) => {
        row[col] = values[i];
      });
      return row;
    }
    
    stmt.free();
    return undefined;
  },

  /** Get all matching rows */
  all(sql: string, ...params: any[]): any[] {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    stmt.bind(params);
    
    const rows: any[] = [];
    const columns = stmt.getColumnNames();
    
    while (stmt.step()) {
      const values = stmt.get();
      const row: any = {};
      columns.forEach((col: string, i: number) => {
        row[col] = values[i];
      });
      rows.push(row);
    }
    
    stmt.free();
    return rows;
  },

  /** Execute raw SQL (for migrations, multi-statement) */
  exec(sql: string): void {
    const database = getDatabase();
    database.exec(sql);
    saveDatabase();
  },

  /** Run multiple operations atomically in pure JS memory */
  transaction<T>(fn: () => T): T {
    const result = fn();
    saveDatabase();
    return result;
  },
};
