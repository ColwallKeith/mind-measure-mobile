/**
 * Secure User Profile API
 * Returns profile data for authenticated user ONLY
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';
import { requireAuth } from '../_lib/auth-middleware';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';
import { getSecureDbConfig } from '../_lib/db-config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  // Only GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate - extract userId from JWT (ONLY source of identity)
  const auth = await requireAuth(req, res);
  if (!auth) return; // 401 already sent

  const { userId } = auth;

  const client = new Client(getSecureDbConfig());

  try {
    await client.connect();

    // Query profile for THIS user ONLY (row-level security)
    const result = await client.query(
      `SELECT 
        user_id,
        first_name,
        last_name,
        course,
        year_of_study,
        accommodation_type,
        university_id,
        created_at,
        updated_at
      FROM profiles
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Profile not found',
        userId 
      });
    }

    res.status(200).json({
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error(`[API] Profile fetch error for user ${userId}:`, error.message);
    res.status(500).json({
      error: 'Internal server error',
      code: 'PROFILE_FETCH_ERROR'
    });
  } finally {
    await client.end();
  }
}
