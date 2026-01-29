/**
 * POST /api/buddies/invite/:inviteId/revoke
 * Set invite status to revoked. Prevent later acceptance.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../_lib/auth-middleware';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../../../_lib/cors-config';
import { getDbClient } from '../../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;
  const { userId } = auth;

  const inviteId = req.query.inviteId as string;
  if (!inviteId) return res.status(400).json({ error: 'inviteId required' });

  const client = getDbClient();

  try {
    await client.connect();
    const r = await client.query(
      `UPDATE buddy_invites SET status = 'revoked', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING id`,
      [inviteId, userId]
    );
    await client.end();
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'Invite not found or not pending' });
    }
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    try { await client.end(); } catch (_) {}
    console.error('[buddies/revoke]', e);
    return res.status(500).json({ error: 'Failed to revoke', message: e?.message });
  }
}
