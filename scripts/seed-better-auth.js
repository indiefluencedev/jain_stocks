const { Pool } = require('@neondatabase/serverless');
const { hashPassword } = require('better-auth/crypto');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedAccounts() {
  const users = await pool.query('SELECT * FROM "user"');
  console.log('Seeding accounts for users count:', users.rows.length);

  for (const u of users.rows) {
    const rawPw = u.username === 'superadmin' ? 'Jain@11614' : 'Demo@2026';
    const hashedPw = await hashPassword(rawPw);

    // Also update displayUsername if null
    if (!u.displayUsername) {
      await pool.query('UPDATE "user" SET "displayUsername" = $1 WHERE id = $2', [u.username, u.id]);
    }

    const existing = await pool.query(
      'SELECT * FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
      [u.id, 'credential']
    );

    if (existing.rows.length === 0) {
      const id = crypto.randomUUID();
      await pool.query(
        'INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [id, u.id, u.email || u.username, 'credential', hashedPw]
      );
      console.log('Inserted credential account for:', u.username, 'email:', u.email);
    } else {
      await pool.query(
        'UPDATE "account" SET password = $1, "updatedAt" = NOW() WHERE "userId" = $2 AND "providerId" = $3',
        [hashedPw, u.id, 'credential']
      );
      console.log('Updated credential account for:', u.username);
    }
  }

  const accountCount = await pool.query('SELECT COUNT(*) FROM "account"');
  console.log('Total accounts in DB now:', accountCount.rows[0].count);
  await pool.end();
}

seedAccounts().catch((err) => {
  console.error(err);
  process.exit(1);
});
