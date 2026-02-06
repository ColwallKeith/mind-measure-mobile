/**
 * POST /api/buddies/invite/consent (public, no auth)
 * Body: { token }
 * Returns invite data (inviter name, invitee name) for displaying consent page.
 * Does NOT accept/decline - just validates token and returns info.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../../_lib/cors-config';
import { getDbClient } from '../_lib/db';
import { hashToken, isExpired } from '../_lib/tokens';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as { token?: string };
  const token = (body?.token ?? '').toString().trim();

  if (!token) return res.status(400).json({ error: 'token required' });

  const tokenHash = hashToken(token);
  const client = getDbClient();

  try {
    await client.connect();

    const row = await client.query(
      `SELECT bi.id, bi.user_id, bi.invitee_name, bi.status, bi.expires_at,
              p.first_name, p.last_name
       FROM buddy_invites bi
       LEFT JOIN profiles p ON p.user_id = bi.user_id
       WHERE bi.token_hash = $1`,
      [tokenHash]
    );

    if (row.rows.length === 0) {
      await client.end();
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const inv = row.rows[0] as {
      id: string;
      user_id: string;
      invitee_name: string;
      status: string;
      expires_at: string;
      first_name: string | null;
      last_name: string | null;
    };

    if (inv.status !== 'pending') {
      await client.end();
      return res.status(400).json({ error: 'Invite already used' });
    }

    if (isExpired(inv.expires_at)) {
      await client.query(
        `UPDATE buddy_invites SET status = 'expired', updated_at = NOW() WHERE id = $1`,
        [inv.id]
      );
      await client.end();
      return res.status(400).json({ error: 'Invite expired' });
    }

    const firstName = inv.first_name || '';
    const lastName = inv.last_name || '';
    const inviterName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Someone';

    await client.end();
    return res.status(200).json({
      inviterName,
      inviteeName: inv.invitee_name,
    });
  } catch (e: any) {
    try { await client.end(); } catch (_) {}
    console.error('[buddies/consent]', e);
    return res.status(500).json({ error: 'Failed to fetch invite', message: e?.message });
  }
}
