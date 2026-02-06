/**
 * GET /api/buddies/optout?token=... (public)
 * Token = opt_out_slug for a Buddy. Remove Buddy, show confirmation. Do not notify user why.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';
import { getDbClient } from './_lib/db';

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
    .card { background: #fff; border-radius: 16px; padding: 32px; max-width: 440px; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,.08); text-align: center; }
    h1 { font-size: 22px; font-weight: 600; color: #0f172a; margin: 0 0 16px; }
    p { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px; }
    .muted { font-size: 13px; color: #94a3b8; margin-top: 24px; }
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

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Content-Type', 'text/html');
    return res.status(405).end(htmlPage('Error', '<h1>Method not allowed</h1><p>Use GET with ?token=... or POST with { "token": "..." }</p>'));
  }

  // Accept token from query string (GET) or request body (POST)
  const token = req.method === 'POST'
    ? (req.body?.token ?? '').toString().trim()
    : (req.query.token ?? '').toString().trim();
  if (!token) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).end(htmlPage('Opt-out', '<h1>Missing token</h1><p>The opt-out link is invalid or incomplete.</p>'));
  }

  const client = getDbClient();

  try {
    await client.connect();
    const r = await client.query(
      `UPDATE buddies SET status = 'removed', updated_at = NOW()
       WHERE opt_out_slug = $1
       RETURNING id`,
      [token]
    );
    await client.end();

    if (r.rowCount === 0) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).end(htmlPage('Opt-out', '<h1>Link invalid or expired</h1><p>This opt-out link has already been used or is no longer valid.</p>'));
    }

    const body = '<h1>You’ve been removed</h1><p>You won’t receive any further check-in reminders from Mind Measure.</p>';
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).end(htmlPage('Opt-out complete', body));
  } catch (e: any) {
    try { await client.end(); } catch (_) {}
    console.error('[buddies/optout]', e);
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).end(htmlPage('Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'));
  }
}
