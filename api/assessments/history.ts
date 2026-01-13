/**
 * Get Assessment History for Authenticated User
 * Secure endpoint - requires JWT authentication
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth-middleware';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';
import { queryDatabase } from '../_lib/db-query';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  // Only GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate - extract userId from JWT
  const auth = await requireAuth(req, res);
  if (!auth) return; // 401 already sent

  const { userId } = auth;

  try {
    // Direct pg client connection (bypassing queryDatabase helper for now)
    const { Client } = require('pg');
    const client = new Client({
      host: process.env.AWS_AURORA_HOST,
      port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
      database: process.env.AWS_AURORA_DATABASE,
      user: process.env.AWS_AURORA_USERNAME,
      password: process.env.AWS_AURORA_PASSWORD,
      ssl: { rejectUnauthorized: false } // Vercel serverless doesn't have RDS CA bundle
    });

    await client.connect();
    
    const result = await client.query(
      `SELECT id, user_id, final_score, created_at, analysis
       FROM fusion_outputs
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    
    await client.end();

    res.status(200).json({
      data: result.rows,
      count: result.rows.length
    });

  } catch (error: any) {
    console.error(`[API] Assessment history fetch error for user ${userId}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'ASSESSMENT_HISTORY_FETCH_ERROR',
      details: error.message
    });
  }
}
