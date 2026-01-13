/**
 * ⚠️ DEPRECATED - SECURITY RISK ⚠️
 * STATUS: DISABLED - Returns 410 Gone
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  console.error('[SECURITY] Deprecated endpoint access attempt', {
    method: req.method,
    url: req.url
  });

  res.status(410).json({
    error: 'Endpoint Deprecated',
    message: 'Generic database endpoints disabled for security.',
    code: 'ENDPOINT_DEPRECATED'
  });
}
