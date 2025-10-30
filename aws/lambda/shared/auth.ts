/**
 * AWS Cognito JWT Token Validation
 * HIPAA-compliant authentication for Lambda functions
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Create JWT verifier for access tokens
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID!,
});

export interface AuthenticatedUser {
  id: string;
  email: string;
  username?: string;
}

/**
 * Validate Cognito JWT token from Authorization header
 * @param authHeader - Authorization header value (Bearer token)
 * @returns Authenticated user object or null if invalid
 */
export async function validateCognitoToken(authHeader?: string): Promise<AuthenticatedUser | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('Missing or invalid Authorization header format');
    return null;
  }
  
  try {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = await verifier.verify(token);
    
    return {
      id: payload.sub as string,
      email: (payload.email as string) || '',
      username: payload.username as string
    };
  } catch (error) {
    console.error('Token validation failed:', error);
    return null;
  }
}

/**
 * Create standardized unauthorized response
 */
export function createUnauthorizedResponse() {
  return {
    statusCode: 401,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    },
    body: JSON.stringify({ error: 'Unauthorized' })
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(statusCode: number, message: string, details?: any) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    },
    body: JSON.stringify({ 
      error: message,
      ...(details && { details })
    })
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(data: any) {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    },
    body: JSON.stringify(data)
  };
}
