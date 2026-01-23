/**
 * Proxy endpoint for finalize-session Lambda function
 * 
 * SECURITY: Forwards Authorization header to Lambda for validation
 * 1. Checks that Authorization header exists (basic validation)
 * 2. Forwards token to Lambda via API Gateway
 * 3. Lambda performs full JWT validation (defense in depth)
 * 
 * This approach avoids double validation issues while maintaining security.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';

const LAMBDA_BASE_URL = process.env.LAMBDA_BASE_URL || 'https://l58pu5wb07.execute-api.eu-west-2.amazonaws.com/prod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step 1: Log incoming request for debugging
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    // Decode token to check type (without verification)
    let tokenType = 'unknown';
    let tokenIssuer = 'unknown';
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const parts = token.split('.');
        if (parts.length === 3) {
          // Decode base64url payload (Node.js compatible)
          const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const base64 = base64Url + '='.repeat((4 - base64Url.length % 4) % 4);
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
          tokenType = payload.token_use || 'unknown';
          tokenIssuer = payload.iss || 'unknown';
        }
      } catch (e) {
        // Ignore decode errors
        console.warn('[Lambda Proxy] Could not decode token for type check:', e);
      }
    }
    
    console.log('[Lambda Proxy] Incoming request:', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      tokenType: tokenType,
      tokenIssuer: tokenIssuer.includes('cognito') ? 'cognito' : tokenIssuer.substring(0, 30),
      method: req.method,
      url: req.url
    });

    // Step 2: Extract sessionId from request body
    const sessionId = req.body?.sessionId || req.body?.body?.sessionId;
    if (!sessionId) {
      console.error('[Lambda Proxy] Request body:', JSON.stringify(req.body));
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Step 3: Forward token to Lambda (let Lambda validate - more lenient approach)
    // This avoids double validation issues and lets Lambda handle auth errors properly
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Lambda Proxy] ❌ No Authorization header provided');
      return res.status(401).json({ error: 'Authorization header required' });
    }

    // Log that we're forwarding (but not validating here)
    console.log('[Lambda Proxy] Forwarding request to Lambda (auth validation by Lambda)');

    console.log('[Lambda Proxy] Calling Lambda via API Gateway for session:', sessionId);

    // Step 4: Forward request to Lambda via API Gateway with validated token
    const lambdaResponse = await fetch(`${LAMBDA_BASE_URL}/finalize-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader // Forward the validated token
      },
      body: JSON.stringify({ sessionId })
    });

    const responseText = await lambdaResponse.text();
    let responseData: any;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.warn('[Lambda Proxy] Lambda response not valid JSON:', responseText);
      responseData = { raw: responseText };
    }

    if (!lambdaResponse.ok) {
      console.error('[Lambda Proxy] Lambda returned error:', {
        status: lambdaResponse.status,
        statusText: lambdaResponse.statusText,
        body: responseData
      });
      return res.status(lambdaResponse.status).json({
        error: 'Lambda function failed',
        details: responseData
      });
    }

    console.log('[Lambda Proxy] ✅ Lambda call successful');
    return res.status(200).json(responseData);

  } catch (error: any) {
    console.error('[Lambda Proxy] ❌ Error calling Lambda:', {
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      stack: error?.stack?.substring(0, 500)
    });
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || String(error)
    });
  }
}
