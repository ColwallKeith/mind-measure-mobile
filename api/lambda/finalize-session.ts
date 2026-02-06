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
    // Step 1: Log incoming request with detailed JWT claims
    const rawAuth = req.headers.authorization || req.headers.Authorization;
    const authHeader: string | undefined = Array.isArray(rawAuth) ? rawAuth[0] : (typeof rawAuth === 'string' ? rawAuth : undefined);
    
    // Decode and log JWT claims for debugging
    let tokenClaims: any = null;
    let authHeaderFormat = 'none';
    
    if (authHeader?.startsWith('Bearer ')) {
      authHeaderFormat = `Bearer ${authHeader.substring(7, 27)}...${authHeader.substring(authHeader.length - 10)} (length: ${authHeader.length})`;
      
      try {
        const token = authHeader.substring(7);
        const parts = token.split('.');
        if (parts.length === 3) {
          // Decode base64url payload (Node.js compatible)
          const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const base64 = base64Url + '='.repeat((4 - base64Url.length % 4) % 4);
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
          
          // Extract key claims
          tokenClaims = {
            token_use: payload.token_use || 'unknown',
            iss: payload.iss || 'unknown',
            aud: payload.aud || payload.client_id || 'unknown',
            client_id: payload.client_id || payload.aud || 'unknown',
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'unknown',
            exp_timestamp: payload.exp || 'unknown',
            sub: payload.sub ? payload.sub.substring(0, 20) + '...' : 'unknown',
            iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'unknown'
          };
          
          // Check if token is expired
          if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            tokenClaims.isExpired = payload.exp < now;
            tokenClaims.expiresInSeconds = payload.exp - now;
          }
        }
      } catch (e) {
        console.warn('[Lambda Proxy] Could not decode token for claims:', e);
      }
    }

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

    // Step 4: Forward request to Lambda via API Gateway with validated token
    const lambdaResponse = await fetch(`${LAMBDA_BASE_URL}/finalize-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader as string // Validated above as Bearer token
      },
      body: JSON.stringify({ sessionId })
    });

    // Extract diagnostic headers from API Gateway response
    const errorType = lambdaResponse.headers.get('x-amzn-ErrorType') || 
                      lambdaResponse.headers.get('x-amzn-errortype') ||
                      lambdaResponse.headers.get('X-Amzn-Errortype') ||
                      'not-provided';
    const requestId = lambdaResponse.headers.get('x-amzn-RequestId') ||
                     lambdaResponse.headers.get('x-amzn-requestid') ||
                     lambdaResponse.headers.get('X-Amzn-Requestid') ||
                     'not-provided';
    const apiGatewayId = lambdaResponse.headers.get('x-amz-apigw-id') ||
                         lambdaResponse.headers.get('x-amz-apigw-request-id') ||
                         lambdaResponse.headers.get('X-Amz-Apigw-Id') ||
                         'not-provided';

    // Log all response headers for debugging
    const allHeaders: Record<string, string> = {};
    lambdaResponse.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });

    const responseText = await lambdaResponse.text();
    let responseData: any;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.warn('[Lambda Proxy] Lambda response not valid JSON:', responseText);
      responseData = { raw: responseText };
    }

    // Determine error source based on headers
    if (!lambdaResponse.ok) {
      const isApiGatewayError = errorType !== 'not-provided' && 
                                 (errorType.toLowerCase().includes('unauthorized') ||
                                  errorType.toLowerCase().includes('forbidden') ||
                                  errorType.toLowerCase().includes('token') ||
                                  errorType.toLowerCase().includes('authorizer'));
      
      const isLambdaError = !isApiGatewayError && lambdaResponse.status === 401;
      
      console.error('[Lambda Proxy] ❌ Lambda returned error:', {
        status: lambdaResponse.status,
        statusText: lambdaResponse.statusText,
        errorSource: isApiGatewayError ? 'API_GATEWAY_AUTHORIZER' : 
                     isLambdaError ? 'LAMBDA_FUNCTION' : 'UNKNOWN',
        diagnosticHeaders: {
          'x-amzn-ErrorType': errorType,
          'x-amzn-RequestId': requestId,
          'x-amz-apigw-id': apiGatewayId
        },
        body: responseData,
        interpretation: isApiGatewayError 
          ? '401 likely from API Gateway authorizer - check authorizer configuration, identity source, or user pool mismatch'
          : isLambdaError
          ? '401 from Lambda function - check Lambda internal auth validation (validateCognitoToken)'
          : 'Unknown error source - check both API Gateway and Lambda logs'
      });
      
      return res.status(lambdaResponse.status).json({
        error: 'Lambda function failed',
        details: responseData,
        diagnostic: {
          errorSource: isApiGatewayError ? 'API_GATEWAY_AUTHORIZER' : 
                       isLambdaError ? 'LAMBDA_FUNCTION' : 'UNKNOWN',
          headers: {
            'x-amzn-ErrorType': errorType,
            'x-amzn-RequestId': requestId,
            'x-amz-apigw-id': apiGatewayId
          }
        }
      });
    }

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
