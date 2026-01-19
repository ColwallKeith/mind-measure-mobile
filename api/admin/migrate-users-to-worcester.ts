/**
 * One-Time Migration: Assign All Users to Worcester
 * 
 * TEST PHASE: All users should be assigned to Worcester regardless of email domain
 * 
 * Security: Requires admin password
 * Method: POST
 * Body: { password: "your-admin-password" }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Admin password from environment variable
const ADMIN_PASSWORD = process.env.ADMIN_MIGRATION_PASSWORD || 'mindmeasure-test-2026';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Use POST method'
    });
  }

  // Check admin password
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid admin password'
    });
  }

  // Create database connection
  const pool = new Pool({
    host: process.env.AWS_AURORA_HOST,
    port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
    database: process.env.AWS_AURORA_DATABASE,
    user: process.env.AWS_AURORA_USERNAME,
    password: process.env.AWS_AURORA_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  let client;

  try {
    client = await pool.connect();

    console.log('[Migration] Starting user migration to Worcester...');

    // Step 1: Check current distribution
    const beforeQuery = `
      SELECT 
        university_id,
        COUNT(*) as user_count
      FROM profiles
      GROUP BY university_id
      ORDER BY user_count DESC;
    `;
    
    const before = await client.query(beforeQuery);
    console.log('[Migration] Before:', before.rows);

    // Step 2: Update all users to Worcester
    const updateQuery = `
      UPDATE profiles 
      SET 
        university_id = 'worcester',
        updated_at = NOW()
      RETURNING user_id, email, university_id, updated_at;
    `;

    const result = await client.query(updateQuery);
    console.log('[Migration] Updated', result.rowCount, 'users');

    // Step 3: Verify after
    const after = await client.query(beforeQuery);
    console.log('[Migration] After:', after.rows);

    // Step 4: Get sample of updated users
    const sampleQuery = `
      SELECT 
        user_id,
        email,
        first_name,
        last_name,
        university_id,
        updated_at
      FROM profiles
      ORDER BY updated_at DESC
      LIMIT 10;
    `;

    const sample = await client.query(sampleQuery);

    return res.status(200).json({
      success: true,
      message: `Successfully migrated ${result.rowCount} users to Worcester`,
      stats: {
        before: before.rows,
        after: after.rows,
        updatedCount: result.rowCount
      },
      sampleUsers: sample.rows
    });

  } catch (error: any) {
    console.error('[Migration] Error:', error);
    return res.status(500).json({
      error: 'Migration Failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}
