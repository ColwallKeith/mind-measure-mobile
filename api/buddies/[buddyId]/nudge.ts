/**
 * POST /api/buddies/:buddyId/nudge
 * Send nudge email. Only if Buddy active. Rate-limit e.g. 1 per 14 days.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/auth-middleware';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../../_lib/cors-config';
import { getDbClient } from '../_lib/db';
import { sendNudgeEmail, optOutUrl } from '../_lib/emails';

const NUDGE_COOLDOWN_DAYS = 14;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;
  const { userId } = auth;

  const buddyId = req.query.buddyId as string;
  if (!buddyId) return res.status(400).json({ error: 'buddyId required' });

  const client = getDbClient();

  try {
    await client.connect();

    const row = await client.query(
      `SELECT id, name, email, status, last_nudged_at, opt_out_slug
       FROM buddies WHERE id = $1 AND user_id = $2`,
      [buddyId, userId]
    );

    if (row.rows.length === 0) {
      await client.end();
      return res.status(404).json({ error: 'Buddy not found' });
    }

    const b = row.rows[0] as { id: string; name: string; email: string; status: string; last_nudged_at: string | null; opt_out_slug: string | null };
    if (b.status !== 'active') {
      await client.end();
      return res.status(400).json({ error: 'Buddy is not active' });
    }

    // Fetch inviter's full name for the email
    const inviterRow = await client.query(
      `SELECT first_name, last_name FROM profiles WHERE user_id = $1`,
      [userId]
    );
    const inviterData = inviterRow.rows[0] as { first_name?: string; last_name?: string } | undefined;
    const firstName = inviterData?.first_name || '';
    const lastName = inviterData?.last_name || '';
    const inviterName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'your friend';

    if (b.last_nudged_at) {
      const days = (Date.now() - new Date(b.last_nudged_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days < NUDGE_COOLDOWN_DAYS) {
        await client.end();
        return res.status(429).json({
          error: 'Please wait before sending another nudge',
          retryAfterDays: Math.ceil(NUDGE_COOLDOWN_DAYS - days),
        });
      }
    }

    await client.query(
      `UPDATE buddies SET last_nudged_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2`,
      [buddyId, userId]
    );

    const outUrl = b.opt_out_slug ? optOutUrl(b.opt_out_slug) : '';
    try {
      await sendNudgeEmail({
        to: b.email,
        buddyName: b.name,
        inviterName,
        optOutUrl: outUrl,
      });
    } catch (mailErr: any) {
      console.error('[buddies/nudge] Failed to send nudge email:', mailErr);
      await client.end();
      return res.status(500).json({
        error: 'Nudge recorded but email could not be sent',
        message: mailErr?.message,
      });
    }

    await client.end();
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    try { await client.end(); } catch (_) {}
    console.error('[buddies/nudge]', e);
    return res.status(500).json({ error: 'Failed to nudge', message: e?.message });
  }
}
