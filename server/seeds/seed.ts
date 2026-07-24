import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, dbQuery } from '../src/config/database.js';
import { runMigrations } from '../src/config/migrate.js';

/**
 * Seed the database with fresh demo data.
 * Resets database, creates default users, 15 realistic inventory items with human-readable Item IDs (ITM-001...ITM-015),
 * and sample transactions.
 */
async function seed() {
  console.log('🌱 Starting database reset and seed...\n');

  // Initialize DB and run migrations
  await initDatabase();
  await runMigrations();

  // Clear existing data
  console.log('🧹 Wiping old records from database...');
  dbQuery.exec('DELETE FROM notifications');
  dbQuery.exec('DELETE FROM transactions');
  dbQuery.exec('DELETE FROM items');
  dbQuery.exec('DELETE FROM users');

  // ── ISSUE 2: Default Users ──────────────────────────────────────────
  const adminId = uuidv4();
  const member1Id = uuidv4();
  const member2Id = uuidv4();

  const adminHash = await bcrypt.hash('admin123', 12);
  const memberHash = await bcrypt.hash('member123', 12);

  dbQuery.run(
    'INSERT INTO users (id, name, email, password_hash, role, club, reliability_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
    adminId, 'Admin', 'admin@inventory.ai', adminHash, 'admin', 'Administration', 100
  );
  dbQuery.run(
    'INSERT INTO users (id, name, email, password_hash, role, club, reliability_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
    member1Id, 'Member One', 'member1@inventory.ai', memberHash, 'member', 'Cultural Club', 95
  );
  dbQuery.run(
    'INSERT INTO users (id, name, email, password_hash, role, club, reliability_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
    member2Id, 'Member Two', 'member2@inventory.ai', memberHash, 'member', 'Photography Club', 90
  );

  console.log('✅ Default users created:');
  console.log('   Admin:    admin@inventory.ai / admin123 (Role: admin)');
  console.log('   Member 1: member1@inventory.ai / member123 (Role: member)');
  console.log('   Member 2: member2@inventory.ai / member123 (Role: member)\n');

  // ── ISSUE 3: 15 Realistic Default Inventory Items with Human-Readable IDs ──
  const inventorySeedData = [
    { qrCodeId: 'ITM-001', name: 'Sony Bluetooth Speaker', category: 'Audio', description: 'High-output portable bluetooth speaker', owningClub: 'Cultural Club', condition: 'excellent', status: 'available', quantity: 2, storageLocation: 'Equipment Room A' },
    { qrCodeId: 'ITM-002', name: 'Canon EOS 1500D DSLR Camera', category: 'Camera', description: '24.1 MP DSLR camera with 18-55mm lens', owningClub: 'Photography Club', condition: 'good', status: 'available', quantity: 1, storageLocation: 'Media Room' },
    { qrCodeId: 'ITM-003', name: 'Epson Projector', category: 'Electronics', description: '3LCD high-brightness seminar projector', owningClub: 'Technical Club', condition: 'good', status: 'available', quantity: 2, storageLocation: 'Seminar Hall Store' },
    { qrCodeId: 'ITM-004', name: 'Wireless Microphone', category: 'Audio', description: 'Dual UHF handheld wireless microphone set', owningClub: 'Cultural Club', condition: 'excellent', status: 'available', quantity: 4, storageLocation: 'Stage Storage' },
    { qrCodeId: 'ITM-005', name: 'Extension Board (6 Socket)', category: 'Electrical', description: 'Heavy duty surge protected extension power strip', owningClub: 'Technical Club', condition: 'good', status: 'available', quantity: 10, storageLocation: 'Electrical Store' },
    { qrCodeId: 'ITM-006', name: 'Tripod Stand', category: 'Camera', description: 'Professional aluminum camera tripod with fluid head', owningClub: 'Photography Club', condition: 'excellent', status: 'available', quantity: 3, storageLocation: 'Media Room' },
    { qrCodeId: 'ITM-007', name: 'Football Kit', category: 'Sports', description: 'Full match football kit including balls, cones & bibs', owningClub: 'Sports Club', condition: 'good', status: 'available', quantity: 2, storageLocation: 'Sports Room' },
    { qrCodeId: 'ITM-008', name: 'Volleyball', category: 'Sports', description: 'Official size leather match volleyballs', owningClub: 'Sports Club', condition: 'good', status: 'available', quantity: 5, storageLocation: 'Sports Room' },
    { qrCodeId: 'ITM-009', name: 'Dell Inspiron Laptop', category: 'Computing', description: 'Core i7 student workstation laptop', owningClub: 'Coding Club', condition: 'excellent', status: 'available', quantity: 2, storageLocation: 'Computer Lab' },
    { qrCodeId: 'ITM-010', name: 'HDMI Cable', category: 'Accessories', description: '10m high-speed HDMI 2.1 braided cable', owningClub: 'Technical Club', condition: 'excellent', status: 'available', quantity: 8, storageLocation: 'Electronics Shelf' },
    { qrCodeId: 'ITM-011', name: 'Laser Pointer', category: 'Presentation', description: 'Wireless presentation clicker with red laser', owningClub: 'Technical Club', condition: 'excellent', status: 'available', quantity: 4, storageLocation: 'Seminar Hall' },
    { qrCodeId: 'ITM-012', name: 'DJI Mini Drone', category: 'Camera', description: 'Ultralight foldable 4K aerial camera drone', owningClub: 'Robotics Club', condition: 'good', status: 'available', quantity: 1, storageLocation: 'Robotics Lab' },
    { qrCodeId: 'ITM-013', name: 'Whiteboard Marker Set', category: 'Stationery', description: 'Pack of 12 multi-color dry erase whiteboard markers', owningClub: 'Academic Club', condition: 'excellent', status: 'available', quantity: 15, storageLocation: 'Office Cabinet' },
    { qrCodeId: 'ITM-014', name: 'Portable PA System', category: 'Audio', description: 'Compact sound system with built-in amplifier', owningClub: 'Cultural Club', condition: 'excellent', status: 'available', quantity: 1, storageLocation: 'Auditorium Store' },
    { qrCodeId: 'ITM-015', name: 'Raspberry Pi Kit', category: 'Electronics', description: 'Raspberry Pi 4 Model B 4GB starter kit', owningClub: 'Robotics Club', condition: 'excellent', status: 'available', quantity: 6, storageLocation: 'Robotics Lab' },
  ];

  for (const item of inventorySeedData) {
    const itemId = uuidv4();
    dbQuery.run(
      `INSERT INTO items (id, name, category, description, owning_club, condition, status, quantity, storage_location, qr_code_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      itemId, item.name, item.category, item.description,
      item.owningClub, item.condition, item.status, item.quantity,
      item.storageLocation, item.qrCodeId
    );
  }

  console.log(`✅ ${inventorySeedData.length} realistic inventory items created with Item IDs ITM-001...ITM-015\n`);

  // ── Sample Transactions ──────────────────────────────────────────────
  const firstItem = dbQuery.get('SELECT id FROM items WHERE qr_code_id = ?', 'ITM-001');
  if (firstItem) {
    dbQuery.run(
      `INSERT INTO transactions (id, item_id, user_id, action, timestamp, expected_return_date, notes) VALUES (?, ?, ?, 'borrow', ?, ?, ?)`,
      uuidv4(), firstItem.id, member1Id, new Date().toISOString(), new Date(Date.now() + 7 * 86400000).toISOString(), 'Initial demo test borrow'
    );
  }

  console.log('🎉 Database reset & seed completed successfully!');
}

seed().catch((err) => {
  console.error('❌ Database seed error:', err);
  process.exit(1);
}).finally(() => process.exit(0));
