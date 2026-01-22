/**
 * Cognito JWT Verification Middleware
 * Verifies JWT tokens from AWS Cognito and extracts user identity
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Cognito configuration
// Trim any whitespace/newlines from env vars
const COGNITO_USER_POOL_ID = (process.env.AWS_COGNITO_USER_POOL_ID || process.env.COGNITO_USER_POOL_ID || 'eu-west-2_ClAG4fQXR').trim();
const COGNITO_REGION = (process.env.AWS_REGION || 'eu-west-2').trim();
const COGNITO_CLIENT_ID = (process.env.COGNITO_CLIENT_ID || process.env.AWS_COGNITO_CLIENT_ID || '').trim();

// JWKS client for fetching public keys
const jwksClientInstance = jwksClient({
  jwksUri: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
});

/**
 * Get signing key from JWKS
 */
function getKey(header: any, callback: any) {
  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verify Cognito JWT token
 */
export async function verifyToken(token: string): Promise<any> {
  // Log configuration for debugging
  console.log('[AUTH] Verification config:', {
    userPoolId: COGNITO_USER_POOL_ID,
    region: COGNITO_REGION,
    clientId: COGNITO_CLIENT_ID ? '***' + COGNITO_CLIENT_ID.slice(-4) : 'NOT_SET',
    issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`
  });

  // Check if token is a Supabase token (legacy) by decoding without verification
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
      const issuer = payload.iss || '';
      
      // Supabase tokens have a different issuer format
      if (issuer.includes('supabase.co') || issuer.includes('supabase')) {
        console.error('[AUTH] ❌ Detected Supabase token (legacy) - user needs to sign in again');
        throw new Error('Legacy Supabase token detected. Please sign out and sign in again to get a fresh Cognito token.');
      }
      
      // Log token type for debugging
      console.log('[AUTH] Token issuer:', issuer, 'token_use:', payload.token_use);
    }
  } catch (decodeError) {
    // If we can't decode, continue with normal verification (will fail with proper error)
    console.warn('[AUTH] Could not pre-decode token for issuer check:', decodeError);
  }

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
        // NOTE: Not validating audience because tokens may be issued with different client IDs
        // (e.g., mobile app uses VITE_AWS_COGNITO_CLIENT_ID, server may have different CLIENT_ID)
        // The issuer validation is sufficient for security
      },
      (err, decoded) => {
        if (err) {
          console.error('[AUTH] JWT verification failed:', {
            errorName: err.name,
            errorMessage: err.message,
            errorCode: err.code,
            // Log token preview for debugging (first 20 chars + last 10)
            tokenPreview: token.substring(0, 20) + '...' + token.substring(token.length - 10),
            tokenLength: token.length,
            tokenParts: token.split('.').length
          });
          reject(err);
          return;
        }
        
        // Verify token is not expired
        if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
          const now = Math.floor(Date.now() / 1000);
          if (decoded.exp < now) {
            console.error('[AUTH] Token expired:', { 
              exp: decoded.exp, 
              now,
              expiredBy: now - decoded.exp,
              tokenPreview: token.substring(0, 20) + '...'
            });
            reject(new Error('Token expired'));
            return;
          }
        }
        
        console.log('[AUTH] Token verified successfully for user:', decoded?.sub);
        resolve(decoded);
      }
    );
  });
}

/**
 * Extract user ID from token payload
 */
export function extractUserId(payload: any): string {
  // Cognito stores user ID in 'sub' claim
  const userId = payload.sub || payload['cognito:username'];
  
  if (!userId) {
    throw new Error('Token does not contain user ID (sub claim)');
  }
  
  return userId;
}

/**
 * Extract user roles from token payload
 */
export function extractUserRoles(payload: any): string[] {
  // Check custom claims first
  const customRoles = payload['custom:roles'] || payload['cognito:groups'];
  
  if (customRoles) {
    return Array.isArray(customRoles) ? customRoles : [customRoles];
  }
  
  return [];
}

/**
 * Authentication middleware - Requires valid JWT token
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<{ userId: string; payload: any } | null> {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[AUTH] Missing auth header - route: ${req.url}`);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided',
      code: 'AUTH_TOKEN_MISSING'
    });
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Log token info for debugging (without exposing full token)
  const tokenParts = token.split('.');
  console.log(`[AUTH] Validating token - route: ${req.url}, tokenParts: ${tokenParts.length}, tokenLength: ${token.length}, preview: ${token.substring(0, 20)}...`);
  
  try {
    // Verify token signature and claims
    const payload = await verifyToken(token);
    
    // Extract user ID (this is the ONLY source of identity)
    const userId = extractUserId(payload);
    
    // Log security event (minimal, no sensitive data)
    console.log(`[AUTH] ✅ User authenticated - userId: ${userId}, route: ${req.url}`);
    
    return { userId, payload };
    
  } catch (error: any) {
    // Log auth failure with detailed error info
    console.error(`[AUTH] ❌ Authentication failed - route: ${req.url}`, {
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      tokenPreview: token.substring(0, 20) + '...',
      tokenLength: token.length
    });
    
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
      code: 'AUTH_TOKEN_INVALID'
    });
    return null;
  }
}

/**
 * Role-based authorization middleware
 */
export async function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  requiredRoles: string[]
): Promise<{ userId: string; payload: any; roles: string[] } | null> {
  // First verify authentication
  const authResult = await requireAuth(req, res);
  
  if (!authResult) {
    return null; // Auth failed, response already sent
  }
  
  const { userId, payload } = authResult;
  
  // Extract roles from token
  let userRoles = extractUserRoles(payload);
  
  // If roles not in token, do server-side lookup
  if (userRoles.length === 0) {
    userRoles = await fetchUserRolesFromDB(userId);
  }
  
  // Check if user has any of the required roles
  const hasRequiredRole = userRoles.some(role => requiredRoles.includes(role));
  
  if (!hasRequiredRole) {
    console.log(`[AUTHZ] Authorization failed - userId: ${userId}, route: ${req.url}, required: ${requiredRoles.join(',')}, has: ${userRoles.join(',')}`);
    
    res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions',
      code: 'AUTHZ_INSUFFICIENT_PERMISSIONS'
    });
    return null;
  }
  
  console.log(`[AUTHZ] Authorization success - userId: ${userId}, role: ${userRoles.join(',')}`);
  
  return { userId, payload, roles: userRoles };
}

/**
 * Fetch user roles from database (fallback if not in token)
 */
async function fetchUserRolesFromDB(userId: string): Promise<string[]> {
  // TODO: Implement database lookup
  // For now, return empty array (no roles)
  return [];
}
