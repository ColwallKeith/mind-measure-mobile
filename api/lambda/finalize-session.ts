/**
 * Proxy endpoint for finalize-session Lambda function
 * 
 * This endpoint calls the Lambda function server-side to avoid CORS issues.
 * The Lambda function requires Cognito authentication, which is handled here.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSecureDbConfig } from '../_lib/db-config';

const LAMBDA_BASE_URL = process.env.LAMBDA_BASE_URL || 'https://l58pu5wb07.execute-api.eu-west-2.amazonaws.com/prod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authorization token from request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    // Extract sessionId from request body
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    console.log('[Lambda Proxy] Calling finalize-session Lambda for session:', sessionId);

    // Call Lambda function via API Gateway
    const lambdaResponse = await fetch(`${LAMBDA_BASE_URL}/finalize-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
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
    console.error('[Lambda Proxy] ❌ Error calling Lambda:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || String(error)
    });
  }
}
