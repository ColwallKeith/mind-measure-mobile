/**
 * POST /api/buddies/invite/respond (public, no auth)
 * Body: { token, action: "accept" | "decline" }
 * Accept → mark invite accepted, create Buddy (active). Decline → mark declined.
 * Token single-use and expires.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../../_lib/cors-config';
import { getDbClient } from '../_lib/db';
import { hashToken, isExpired } from '../_lib/tokens';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as { token?: string; action?: string };
  const token = (body?.token ?? '').toString().trim();
  const action = (body?.action ?? '').toString().toLowerCase();

  if (!token) return res.status(400).json({ error: 'token required' });
  if (action !== 'accept' && action !== 'decline') {
    return res.status(400).json({ error: 'action must be accept or decline' });
  }

  const tokenHash = hashToken(token);
  const client = getDbClient();

  try {
    await client.connect();

    const row = await client.query(
      `SELECT id, user_id, invitee_name, contact_value, contact_value_masked, status, expires_at
       FROM buddy_invites
       WHERE token_hash = $1`,
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
      contact_value: string;
      contact_value_masked: string;
      status: string;
      expires_at: string;
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

    if (action === 'decline') {
      await client.query(
        `UPDATE buddy_invites SET status = 'declined', updated_at = NOW() WHERE id = $1`,
        [inv.id]
      );
      await client.end();
      return res.status(200).json({ ok: true, action: 'declined' });
    }

    // accept: create Buddy, mark invite accepted
    await client.query('BEGIN');
    await client.query(
      `UPDATE buddy_invites SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
      [inv.id]
    );
    const maxOrder = await client.query(
      `SELECT COALESCE(MAX(preference_order), 0)::int AS m FROM buddies WHERE user_id = $1`,
      [inv.user_id]
    );
    const nextOrder = (maxOrder.rows[0]?.m ?? 0) + 1;
    const optOutSlug = randomBytes(24).toString('base64url');
    await client.query(
      `INSERT INTO buddies (user_id, invite_id, name, email, status, preference_order, opt_out_slug)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)`,
      [inv.user_id, inv.id, inv.invitee_name, inv.contact_value, nextOrder, optOutSlug]
    );
    await client.query('COMMIT');
    await client.end();

    return res.status(200).json({ ok: true, action: 'accepted' });
  } catch (e: any) {
    try {
      await client.query('ROLLBACK');
      await client.end();
    } catch (_) {}
    console.error('[buddies/respond]', e);
    return res.status(500).json({ error: 'Failed to respond', message: e?.message });
  }
}
