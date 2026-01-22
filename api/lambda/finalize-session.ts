/**
 * Proxy endpoint for finalize-session Lambda function
 * 
 * SECURITY: Uses same auth pattern as /api/database/* routes:
 * 1. Validates user's Cognito JWT token using requireAuth() middleware
 * 2. Forwards validated token to Lambda via API Gateway
 * 3. Lambda validates token again (defense in depth)
 * 
 * This ensures consistent authentication across all API routes.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth-middleware';
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
    const authHeader = req.headers.authorization;
    console.log('[Lambda Proxy] Incoming request:', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      method: req.method,
      url: req.url
    });

    // Step 2: Authenticate user (same validation as /api/database/* routes)
    const auth = await requireAuth(req, res);
    if (!auth) {
      // requireAuth already sent 401 response with proper error format
      // Log additional context for debugging
      console.error('[Lambda Proxy] ❌ Authentication failed:', {
        hasAuthHeader: !!authHeader,
        authHeaderType: authHeader ? (authHeader.startsWith('Bearer ') ? 'Bearer' : 'Other') : 'Missing'
      });
      return;
    }

    const { userId, payload } = auth;
    console.log('[Lambda Proxy] ✅ User authenticated:', userId);

    // Step 2: Extract sessionId from request body
    const sessionId = req.body?.sessionId || req.body?.body?.sessionId;
    if (!sessionId) {
      console.error('[Lambda Proxy] Request body:', JSON.stringify(req.body));
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Step 3: Get the validated token from the request (already validated by requireAuth)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // This should never happen if requireAuth passed, but defensive check
      return res.status(401).json({ error: 'Authorization header missing' });
    }

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
