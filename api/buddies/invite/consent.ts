/**
 * GET /api/buddies/invite/consent?token=... (public)
 * Renders consent page. Token = raw invite token. Accept/Decline POST to /api/buddies/invite/respond.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../../../_lib/cors-config';
import { getDbClient } from '../_lib/db';
import { hashToken, isExpired } from '../_lib/tokens';

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} – Mind Measure</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; background: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .card { background: #fff; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,.08); }
    h1 { font-size: 22px; font-weight: 600; color: #0f172a; margin: 0 0 16px; }
    h2 { font-size: 16px; font-weight: 600; color: #1e293b; margin: 20px 0 8px; }
    p, li { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 12px; }
    ul { margin: 0 0 16px; padding-left: 20px; }
    .btn { display: block; width: 100%; padding: 14px 20px; border-radius: 12px; font-size: 15px; font-weight: 600; text-align: center; cursor: pointer; border: none; text-decoration: none; margin-bottom: 12px; }
    .btn-primary { background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #fff; }
    .btn-secondary { background: #f1f5f9; color: #475569; }
    form { margin-top: 24px; }
    .muted { font-size: 13px; color: #94a3b8; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">${body}</div>
  <p class="muted">mindmeasure.app</p>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'text/html');
    return res.status(405).end(htmlPage('Error', '<h1>Method not allowed</h1>'));
  }

  const token = (req.query.token ?? '').toString().trim();
  if (!token) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).end(htmlPage('Invalid link', '<h1>Invalid or missing link</h1><p>This invite link is invalid or has expired.</p>'));
  }

  const client = getDbClient();
  const tokenHash = hashToken(token);

  try {
    await client.connect();
    const r = await client.query(
      `SELECT bi.id, bi.invitee_name, bi.status, bi.expires_at, p.first_name AS inviter_name
       FROM buddy_invites bi
       LEFT JOIN profiles p ON p.user_id = bi.user_id
       WHERE bi.token_hash = $1`,
      [tokenHash]
    );
    await client.end();

    if (r.rows.length === 0) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).end(htmlPage('Invalid link', '<h1>Invalid or expired link</h1><p>This invite link was not found or has expired.</p>'));
    }

    const inv = r.rows[0] as { id: string; invitee_name: string; status: string; expires_at: string; inviter_name: string | null };
    if (inv.status !== 'pending') {
      res.setHeader('Content-Type', 'text/html');
      return res.status(400).end(htmlPage('Already responded', '<h1>Already responded</h1><p>You have already accepted or declined this invite.</p>'));
    }

    if (isExpired(inv.expires_at)) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(400).end(htmlPage('Expired', '<h1>Invite expired</h1><p>This invite has expired. The person who invited you can send a new one.</p>'));
    }

    const inviter = inv.inviter_name || 'Someone';
    const name = inv.invitee_name;

    const body = `
      <h1>You’re invited to be a Buddy</h1>
      <p><strong>${inviter}</strong> has invited you to be a Buddy on Mind Measure.</p>

      <h2>What is Mind Measure?</h2>
      <p>Mind Measure is a wellbeing app that helps people track how they’re doing over time.</p>

      <h2>What does being a Buddy mean?</h2>
      <p>You’d be someone they trust who might occasionally get a gentle reminder to check in with them when things feel harder than usual.</p>

      <h2>What it is not</h2>
      <ul>
        <li><strong>This isn’t an emergency.</strong> Mind Measure does not alert Buddies in emergencies.</li>
        <li>We don’t monitor or track the person. We don’t share scores, check-ins, or app activity with you.</li>
      </ul>

      <h2>When you might be contacted</h2>
      <p>Only occasionally, when they’ve chosen to ask for a check-in. You’ll get a short, gentle email—nothing urgent.</p>

      <h2>Privacy</h2>
      <p>We don’t share their data with you. You can opt out at any time without explaining why.</p>

      <div id="actions">
        <button type="button" id="btn-accept" class="btn btn-primary">Accept</button>
        <button type="button" id="btn-decline" class="btn btn-secondary">Decline</button>
      </div>
      <div id="result" style="display:none;"></div>
    <script>
      (function() {
        var token = ${JSON.stringify(token)};
        var api = '/api/buddies/invite/respond';
        var card = document.querySelector('.card');
        var actions = document.getElementById('actions');
        var result = document.getElementById('result');
        function done(accepted) {
          actions.style.display = 'none';
          result.style.display = 'block';
          result.innerHTML = accepted
            ? '<h1>You’ve accepted</h1><p>Thanks. You may occasionally get a gentle reminder to check in. You can opt out anytime.</p>'
            : '<h1>You’ve declined</h1><p>No problem. You won’t receive any emails from Mind Measure about this.</p>';
        }
        function err(msg) {
          actions.style.display = 'none';
          result.style.display = 'block';
          result.innerHTML = '<h1>Something went wrong</h1><p>' + (msg || 'Please try again.') + '</p>';
        }
        function submit(action) {
          document.getElementById('btn-accept').disabled = true;
          document.getElementById('btn-decline').disabled = true;
          fetch(api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, action: action })
          }).then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j }; }); })
            .then(function(x) {
              if (x.ok && (x.j.action === 'accepted' || x.j.action === 'declined')) done(x.j.action === 'accepted');
              else err(x.j && x.j.error ? x.j.error : 'Request failed');
            })
            .catch(function() { err(); });
        }
        document.getElementById('btn-accept').onclick = function() { submit('accept'); };
        document.getElementById('btn-decline').onclick = function() { submit('decline'); };
      })();
    </script>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).end(htmlPage('Buddy invite', body));
  } catch (e: any) {
    try { await client.end(); } catch (_) {}
    console.error('[buddies/consent]', e);
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).end(htmlPage('Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'));
  }
}
