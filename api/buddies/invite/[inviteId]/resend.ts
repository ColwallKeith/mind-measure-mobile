/**
 * POST /api/buddies/invite/:inviteId/resend
 * Resend invite email. Only if pending. Rate-limit resends.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../_lib/auth-middleware';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../../../_lib/cors-config';
import { getDbClient } from '../../_lib/db';
import { generateToken, hashToken, inviteExpiresAt } from '../../_lib/tokens';
import { sendInviteEmail, consentUrl } from '../../_lib/emails';

const RESEND_COOLDOWN_HOURS = 1;

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
  if (!inviteId) {
    return res.status(400).json({ error: 'inviteId required' });
  }

  const client = getDbClient();

  try {
    await client.connect();

    const row = await client.query(
      `SELECT bi.id, bi.contact_value, bi.invitee_name, bi.personal_message, bi.status, bi.last_resend_at,
              p.first_name AS inviter_name
       FROM buddy_invites bi
       LEFT JOIN profiles p ON p.user_id = bi.user_id
       WHERE bi.id = $1 AND bi.user_id = $2`,
      [inviteId, userId]
    );

    if (row.rows.length === 0) {
      await client.end();
      return res.status(404).json({ error: 'Invite not found' });
    }

    const inv = row.rows[0] as {
      contact_value: string;
      invitee_name: string;
      personal_message: string | null;
      status: string;
      last_resend_at: string | null;
      inviter_name: string | null;
    };
    if (inv.status !== 'pending') {
      await client.end();
      return res.status(400).json({ error: 'Can only resend pending invites' });
    }

    if (inv.last_resend_at) {
      const hours = (Date.now() - new Date(inv.last_resend_at).getTime()) / (1000 * 60 * 60);
      if (hours < RESEND_COOLDOWN_HOURS) {
        await client.end();
        return res.status(429).json({
          error: 'Please wait before resending',
          retryAfterMinutes: Math.ceil((RESEND_COOLDOWN_HOURS - hours) * 60),
        });
      }
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = inviteExpiresAt();

    await client.query(
      `UPDATE buddy_invites
       SET token_hash = $1, expires_at = $2, resend_count = resend_count + 1, last_resend_at = NOW(), sent_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND user_id = $4`,
      [tokenHash, expiresAt, inviteId, userId]
    );

    const url = consentUrl(token);
    try {
      await sendInviteEmail({
        to: inv.contact_value,
        inviteeName: inv.invitee_name,
        inviterName: inv.inviter_name || 'Someone',
        personalMessage: inv.personal_message,
        consentUrl: url,
      });
    } catch (mailErr: any) {
      const sesMessage = mailErr?.message ?? '';
      const sesCode = mailErr?.name ?? mailErr?.Code ?? '';
      const detail = [sesMessage, sesCode].filter(Boolean).join(' — ');
      console.error('[buddies/resend] Failed to send invite email:', mailErr);
      await client.end();
      return res.status(500).json({
        error: 'Invite updated but email could not be sent',
        message: detail || 'Unknown SES error',
      });
    }

    await client.end();
    return res.status(200).json({ ok: true, message: 'Invite resent' });
  } catch (e: any) {
    try { await client.end(); } catch (_) {}
    console.error('[buddies/resend]', e);
    return res.status(500).json({ error: 'Failed to resend', message: e?.message });
  }
}
