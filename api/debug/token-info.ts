/**
 * DEBUG ENDPOINT - Token Info
 * Shows JWT token claims without verifying signature (for debugging only)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    // Decode token WITHOUT verification (just to see claims)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Show relevant info (mask sensitive data)
    return res.status(200).json({
      header,
      payload: {
        sub: payload.sub,
        iss: payload.iss,
        aud: payload.aud,
        token_use: payload.token_use,
        exp: payload.exp,
        iat: payload.iat,
        exp_human: new Date(payload.exp * 1000).toISOString(),
        iat_human: new Date(payload.iat * 1000).toISOString(),
        now_human: new Date().toISOString(),
        is_expired: payload.exp < Math.floor(Date.now() / 1000),
        email: payload.email,
        'cognito:username': payload['cognito:username']
      },
      config: {
        raw_COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || 'NOT_SET',
        raw_AWS_COGNITO_USER_POOL_ID: process.env.AWS_COGNITO_USER_POOL_ID || 'NOT_SET',
        trimmed_user_pool_id: (process.env.AWS_COGNITO_USER_POOL_ID || process.env.COGNITO_USER_POOL_ID || 'eu-west-2_ClAG4fQXR').trim(),
        AWS_COGNITO_CLIENT_ID: process.env.AWS_COGNITO_CLIENT_ID ? '***' + process.env.AWS_COGNITO_CLIENT_ID.slice(-4) : 'NOT_SET',
        COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ? '***' + process.env.COGNITO_CLIENT_ID.slice(-4) : 'NOT_SET',
        trimmed_client_id: (process.env.COGNITO_CLIENT_ID || process.env.AWS_COGNITO_CLIENT_ID || '').trim(),
        AWS_REGION: process.env.AWS_REGION || 'NOT_SET',
        expected_issuer_after_trim: `https://cognito-idp.${(process.env.AWS_REGION || 'eu-west-2').trim()}.amazonaws.com/${(process.env.AWS_COGNITO_USER_POOL_ID || process.env.COGNITO_USER_POOL_ID || 'eu-west-2_ClAG4fQXR').trim()}`
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to decode token', details: error.message });
  }
}
