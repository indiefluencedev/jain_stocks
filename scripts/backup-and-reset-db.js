const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function resetDB() {
  console.log('--- STARTING DATABASE BACKUP AND RESET ---');

  // 1. Fetch current data for backup
  const users = await pool.query('SELECT * FROM "user"');
  const accounts = await pool.query('SELECT * FROM "account"');
  const parts = await pool.query('SELECT * FROM "parts"');
  const destinations = await pool.query('SELECT * FROM "destinations"');
  const stockLedger = await pool.query('SELECT * FROM "stock_ledger"').catch(() => ({ rows: [] }));
  const requests = await pool.query('SELECT * FROM "requests"').catch(() => ({ rows: [] }));
  const challans = await pool.query('SELECT * FROM "challans"').catch(() => ({ rows: [] }));
  const inwards = await pool.query('SELECT * FROM "inwards"').catch(() => ({ rows: [] }));
  const auditLogs = await pool.query('SELECT * FROM "audit_logs"').catch(() => ({ rows: [] }));
  const appState = await pool.query('SELECT * FROM "app_state"').catch(() => ({ rows: [] }));

  const backupData = {
    timestamp: new Date().toISOString(),
    users: users.rows,
    accounts: accounts.rows,
    parts: parts.rows,
    destinations: destinations.rows,
    stockLedger: stockLedger.rows,
    requests: requests.rows,
    challans: challans.rows,
    inwards: inwards.rows,
    auditLogs: auditLogs.rows,
    appState: appState.rows,
  };

  // Ensure backup directory exists
  const backupDir = path.join(process.cwd(), '.agent', 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, `database_backup_${Date.now()}.json`);
  const latestBackupPath = path.join(backupDir, `database_backup_latest.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
  fs.writeFileSync(latestBackupPath, JSON.stringify(backupData, null, 2));
  console.log(`✅ Backup successfully saved to ${backupFilePath}`);

  // 2. Clear transactional logs & records
  console.log('Clearing transactional records (ledger, requests, challans, inwards, audit_logs, session)...');
  await pool.query('TRUNCATE TABLE request_items, requests, challans, inwards, stock_ledger, audit_logs, session CASCADE;').catch((err) => console.log('Truncate notice:', err.message));
  console.log('✅ Transactional records cleared.');

  // 3. Remove non-superadmin users
  console.log('Removing demo users from account & user tables (keeping only superadmin)...');
  const superadminUser = users.rows.find(u => u.username === 'superadmin');
  if (!superadminUser) {
    throw new Error('Superadmin user not found in database! Aborting reset.');
  }

  await pool.query('DELETE FROM "account" WHERE "userId" != $1', [superadminUser.id]);
  await pool.query('DELETE FROM "user" WHERE id != $1', [superadminUser.id]);
  console.log(`✅ Users cleaned up. Retained Super Admin: ${superadminUser.username} (${superadminUser.email}).`);

  // 4. Clean up app_state snapshot
  let currentStore = {};
  if (appState.rows.length > 0 && appState.rows[0].value) {
    try {
      currentStore = typeof appState.rows[0].value === 'string' ? JSON.parse(appState.rows[0].value) : appState.rows[0].value;
    } catch (e) {}
  }

  const cleanStore = {
    users: [
      {
        id: superadminUser.id,
        name: superadminUser.name || 'Super Admin',
        username: 'superadmin',
        role: 'super_admin',
        phone: superadminUser.phone || '',
        salt: superadminUser.salt || '',
        hash: superadminUser.hash || '',
        active: true,
        deleted: false,
        createdAt: superadminUser.createdAt || Date.now(),
        lastLogin: Date.now(),
      }
    ],
    parts: currentStore.parts || parts.rows,
    destinations: currentStore.destinations || destinations.rows,
    ledger: [],
    requests: [],
    challans: [],
    inwards: [],
    audit: [
      {
        id: 'AU_INIT',
        ts: Date.now(),
        userId: superadminUser.id,
        userName: 'Super Admin',
        role: 'Super Admin',
        action: 'Database Reset & Hardened Setup',
        detail: 'Cleared demo transactions and retained Super Admin account',
        entity: 'system'
      }
    ],
    settings: currentStore.settings || {
      companyName: 'Jain Automobiles',
      companySub: 'Authorised Royal Enfield Dealer · Hisar',
      approvalRequired: true,
      allowNegative: false,
      sessionHours: 10,
    }
  };

  await pool.query(`
    INSERT INTO app_state (key, value, updated_at)
    VALUES ('full_store', $1, NOW())
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = NOW()
  `, [JSON.stringify(cleanStore)]);

  console.log('✅ Clean app_state snapshot updated.');
  console.log('--- DATABASE RESET COMPLETED SUCCESSFULLY ---');
  await pool.end();
}

resetDB().catch((err) => {
  console.error('DATABASE RESET ERROR:', err);
  process.exit(1);
});
