/**
 * ⚠️ DEPRECATED - SECURITY RISK ⚠️
 * 
 * This generic database proxy endpoint is a CRITICAL SECURITY VULNERABILITY.
 * It allows arbitrary table access without proper authorization.
 * 
 * STATUS: DISABLED - Returns 410 Gone
 * 
 * MIGRATION PATH:
 * All clients must migrate to task-specific endpoints:
 * - GET /api/users/profile -> Get user profile
 * - GET /api/assessments/history -> Get assessment history
 * - POST /api/assessments/create -> Create assessment
 * etc.
 * 
 * This endpoint will be REMOVED in the next deployment.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(req, res);
  
  // Handle preflight
  if (handleCorsPreflightIfNeeded(req, res)) {
    return;
  }

  // Log deprecation warning
  console.error('[SECURITY] Attempted access to deprecated generic database endpoint', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    body: req.body ? Object.keys(req.body) : []
  });

  // Return 410 Gone
  res.status(410).json({
    error: 'Endpoint Deprecated',
    message: 'This generic database proxy endpoint has been disabled for security reasons.',
    code: 'ENDPOINT_DEPRECATED',
    migration: {
      reason: 'Generic database access endpoints pose a critical security risk',
      action: 'Please migrate to task-specific API endpoints',
      endpoints: {
        profiles: 'GET /api/users/profile',
        assessments: 'GET /api/assessments/history',
        reports: 'POST /api/reports/generate'
      },
      documentation: 'https://docs.mindmeasure.co.uk/api-migration'
    }
  });
}
