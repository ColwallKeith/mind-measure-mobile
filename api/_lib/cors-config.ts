/**
 * CORS Configuration - Secure Allowlist
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Allowed origins - NO WILDCARDS
const ALLOWED_ORIGINS = [
  // Production
  'https://mobile.mindmeasure.app',
  'https://admin.mindmeasure.co.uk',
  'https://mindmeasure.co.uk',
  
  // Capacitor mobile apps
  'capacitor://localhost',
  'ionic://localhost',
  
  // Development (only if NODE_ENV is development)
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ] : [])
];

/**
 * Set CORS headers with allowlist validation
 */
export function setCorsHeaders(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  
  // Check if origin is in allowlist
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    return true;
  }
  
  // If no origin header (server-to-server or same-origin), allow
  if (!origin) {
    return true;
  }
  
  // Origin not in allowlist
  console.log(`[CORS] Rejected origin: ${origin}, route: ${req.url}`);
  return false;
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightIfNeeded(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    const corsAllowed = setCorsHeaders(req, res);
    
    if (!corsAllowed) {
      res.status(403).json({ error: 'CORS policy violation' });
      return true;
    }
    
    res.status(200).end();
    return true;
  }
  
  return false;
}
