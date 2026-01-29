/**
 * GET /api/buddies
 * List active buddies and pending invites.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth-middleware';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';
import { getDbClient } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;
  const { userId } = auth;

  const client = getDbClient();

  try {
    await client.connect();

    const [buddiesResult, invitesResult] = await Promise.all([
      client.query(
        `SELECT id, name, email, preference_order, created_at
         FROM buddies
         WHERE user_id = $1 AND status = 'active'
         ORDER BY preference_order ASC, created_at ASC`,
        [userId]
      ),
      client.query(
        `SELECT id, invitee_name, contact_type, contact_value_masked, status, sent_at, expires_at
         FROM buddy_invites
         WHERE user_id = $1 AND status = 'pending'
         ORDER BY created_at DESC`,
        [userId]
      ),
    ]);

    await client.end();

    const activeBuddies = (buddiesResult.rows || []).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      preferenceOrder: r.preference_order,
      createdAt: r.created_at,
    }));

    const pendingInvites = (invitesResult.rows || []).map((r) => ({
      id: r.id,
      inviteeName: r.invitee_name,
      contactType: r.contact_type,
      contactValueMasked: r.contact_value_masked,
      status: r.status,
      sentAt: r.sent_at,
      expiresAt: r.expires_at,
    }));

    return res.status(200).json({ activeBuddies, pendingInvites });
  } catch (e: any) {
    try { await client.end(); } catch (_) {}
    console.error('[buddies] list', e);
    return res.status(500).json({
      error: 'Failed to list buddies',
      message: e?.message,
    });
  }
}
