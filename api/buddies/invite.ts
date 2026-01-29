/**
 * POST /api/buddies/invite
 * Create invite. Validate email, max 5 total, store token hash, send invite email.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth-middleware';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';
import { getDbClient, maskEmail } from './_lib/db';
import { generateToken, hashToken, inviteExpiresAt } from './_lib/tokens';
import { sendInviteEmail, consentUrl } from './_lib/emails';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TOTAL = 5;

interface CreateInviteBody {
  inviteeName: string;
  contactType: 'email';
  contactValue: string;
  personalMessage?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;
  const { userId } = auth;

  const body = req.body as CreateInviteBody;
  const inviteeName = (body?.inviteeName ?? '').toString().trim();
  const contactType = body?.contactType ?? 'email';
  const contactValue = (body?.contactValue ?? '').toString().trim().toLowerCase();
  const personalMessage = (body?.personalMessage ?? '').toString().trim() || null;

  if (!inviteeName) {
    return res.status(400).json({ error: 'inviteeName is required' });
  }
  if (contactType !== 'email') {
    return res.status(400).json({ error: 'contactType must be email' });
  }
  if (!EMAIL_REGEX.test(contactValue)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const client = getDbClient();
  const host = process.env.AWS_AURORA_HOST || process.env.AWS_RDS_HOST;
  if (!host) {
    console.error('[buddies/invite] Missing AWS_AURORA_HOST or AWS_RDS_HOST');
    return res.status(500).json({
      error: 'Failed to create invite',
      message: 'Server configuration error',
    });
  }

  try {
    await client.connect();

    const inviterRow = await client.query(
      `SELECT first_name FROM profiles WHERE user_id = $1`,
      [userId]
    );
    const inviterName = (inviterRow.rows[0] as { first_name?: string } | undefined)?.first_name || 'Someone';

    const countResult = await client.query(
      `SELECT (
        (SELECT COUNT(*) FROM buddy_invites WHERE user_id = $1 AND status = 'pending') +
        (SELECT COUNT(*) FROM buddies WHERE user_id = $1 AND status = 'active')
      )::int AS total`,
      [userId]
    );
    const total = parseInt(String(countResult.rows[0]?.total ?? 0), 10);
    if (total >= MAX_TOTAL) {
      await client.end();
      return res.status(400).json({ error: 'Maximum 5 buddies or pending invites reached' });
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = inviteExpiresAt();
    const contactValueMasked = maskEmail(contactValue);

    const insert = await client.query(
      `INSERT INTO buddy_invites (
        user_id, invitee_name, contact_type, contact_value, contact_value_masked,
        personal_message, status, token_hash, sent_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), $8)
      RETURNING id, invitee_name, contact_type, contact_value_masked, status, sent_at, expires_at`,
      [userId, inviteeName, contactType, contactValue, contactValueMasked, personalMessage, tokenHash, expiresAt]
    );

    const row = insert.rows[0];
    const invite = {
      id: row.id,
      inviteeName: row.invitee_name,
      contactType: row.contact_type,
      contactValueMasked: row.contact_value_masked,
      status: row.status,
      sentAt: row.sent_at,
      expiresAt: row.expires_at,
    };

    const url = consentUrl(token);
    try {
      await sendInviteEmail({
        to: contactValue,
        inviteeName,
        inviterName,
        personalMessage,
        consentUrl: url,
      });
    } catch (mailErr: any) {
      const sesMessage = mailErr?.message ?? '';
      const sesCode = mailErr?.name ?? mailErr?.Code ?? '';
      const detail = [sesMessage, sesCode].filter(Boolean).join(' — ');
      console.error('[buddies/invite] Failed to send invite email:', mailErr);
      await client.end();
      return res.status(500).json({
        error: 'Invite created but email could not be sent',
        message: detail || 'Unknown SES error',
      });
    }

    await client.end();
    return res.status(200).json({ invite });
  } catch (e: any) {
    try { await client.end(); } catch (_) {}
    console.error('[buddies/invite]', e);
    return res.status(500).json({
      error: 'Failed to create invite',
      message: e?.message,
    });
  }
}
