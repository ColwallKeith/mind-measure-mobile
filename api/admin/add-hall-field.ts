import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Starting migration 008: Add hall_of_residence to profiles');

    // Create Aurora connection pool
    const pool = new Pool({
      host: process.env.AURORA_CLUSTER_ENDPOINT,
      port: 5432,
      database: process.env.AURORA_DB_NAME || 'mindmeasure',
      user: process.env.AURORA_DB_USER || 'mindmeasure_admin',
      password: process.env.AURORA_DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Migration SQL
    const migrationSQL = `
      -- Add hall_of_residence column to profiles table
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS hall_of_residence TEXT;

      -- Add index for better performance
      CREATE INDEX IF NOT EXISTS idx_profiles_hall_of_residence 
      ON profiles(hall_of_residence) 
      WHERE hall_of_residence IS NOT NULL;
    `;

    // Execute migration
    await pool.query(migrationSQL);

    // Verify the column was added
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'profiles' 
      AND column_name = 'hall_of_residence'
    `);

    await pool.end();

    if (rows.length === 0) {
      throw new Error('Column was not created');
    }

    console.log('✅ Migration 008 completed successfully');
    console.log('Column details:', rows[0]);

    return res.status(200).json({
      success: true,
      message: 'Migration 008 completed: Added hall_of_residence column to profiles',
      column: rows[0]
    });

  } catch (error: any) {
    console.error('❌ Migration 008 failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
}
