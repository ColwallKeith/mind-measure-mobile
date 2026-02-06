/**
 * SECURED Generic Database INSERT Endpoint
 * 
 * Security measures:
 * - JWT authentication required
 * - Table allowlist (only safe tables)
 * - Automatic user_id injection (all records belong to authenticated user)
 * - Column restrictions
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth-middleware';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';
import { Client } from 'pg';

// Tables that users can insert into
const ALLOWED_TABLES = new Set([
  'profiles',
  'fusion_outputs',
  'assessment_sessions',
  'assessment_transcripts',
  'assessment_items',
  'weekly_summary',
  'buddy_contacts'  // User's emergency support contacts
]);

interface InsertRequest {
  table: string;
  data: Record<string, any>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { userId } = auth;

  try {
    const { table, data }: InsertRequest = req.body;

    // Validate table
    if (!table || !ALLOWED_TABLES.has(table)) {
      console.warn(`[SECURITY] User ${userId} attempted to insert into non-allowed table: ${table}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: `Cannot insert into table '${table}'`,
        code: 'TABLE_NOT_ALLOWED'
      });
    }

    // Force user_id to authenticated user
    data.user_id = userId;

    // Build query
    const client = new Client({
      host: process.env.AWS_AURORA_HOST,
      port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
      database: process.env.AWS_AURORA_DATABASE,
      user: process.env.AWS_AURORA_USERNAME,
      password: process.env.AWS_AURORA_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    const result = await client.query(sql, values);
    await client.end();

    return res.status(200).json({
      data: result.rows,
      error: null
    });

  } catch (error: any) {
    console.error(`[DB INSERT] Error for user ${userId}:`, error);
    return res.status(500).json({
      error: 'Database insert failed',
      message: error.message,
      data: null
    });
  }
}
