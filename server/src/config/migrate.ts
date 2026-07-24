import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, dbQuery } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run all SQL migration files in order.
 * Reads .sql files from the migrations directory and executes them.
 */
export async function runMigrations(): Promise<void> {
  await initDatabase();
  const migrationsDir = path.resolve(__dirname, '../../migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('⚠️  No migrations directory found');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    dbQuery.exec(sql);
    console.log(`✅ Migration applied: ${file}`);
  }

  console.log('🎉 All migrations applied successfully');
}

// Allow running directly: tsx src/config/migrate.ts
const isMainModule = process.argv[1]?.includes('migrate');
if (isMainModule) {
  runMigrations().then(() => process.exit(0));
}
