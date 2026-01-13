/**
 * Cognito JWT Verification Middleware
 * Verifies JWT tokens from AWS Cognito and extracts user identity
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Cognito configuration
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'eu-west-2_ClAG4fQXR';
const COGNITO_REGION = process.env.AWS_REGION || 'eu-west-2';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

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
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
        // Verify audience if client ID is set
        ...(COGNITO_CLIENT_ID ? { audience: COGNITO_CLIENT_ID } : {}),
      },
      (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Verify token is not expired
        if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
          const now = Math.floor(Date.now() / 1000);
          if (decoded.exp < now) {
            reject(new Error('Token expired'));
            return;
          }
        }
        
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
    res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided',
      code: 'AUTH_TOKEN_MISSING'
    });
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Verify token signature and claims
    const payload = await verifyToken(token);
    
    // Extract user ID (this is the ONLY source of identity)
    const userId = extractUserId(payload);
    
    // Log security event (minimal, no sensitive data)
    console.log(`[AUTH] User authenticated - userId: ${userId}, route: ${req.url}`);
    
    return { userId, payload };
    
  } catch (error: any) {
    // Log auth failure
    console.log(`[AUTH] Authentication failed - route: ${req.url}, error: ${error.message}`);
    
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
