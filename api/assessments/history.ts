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
    // Query assessment history for THIS user ONLY
    const assessments = await queryDatabase(
      `SELECT id, user_id, final_score, created_at, analysis
       FROM fusion_outputs
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json({
      data: assessments,
      count: assessments.length
    });

  } catch (error: any) {
    console.error(`[API] Assessment history fetch error for user ${userId}:`, error.message);
    res.status(500).json({
      error: 'Internal server error',
      code: 'ASSESSMENT_HISTORY_FETCH_ERROR'
    });
  }
}
