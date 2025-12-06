import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxy endpoint for Assessment Engine: Get Check-in Status
 * Forwards requests from mobile app to Assessment Engine API to avoid CORS issues
 * 
 * POST /api/assessment-engine/get-checkin
 * Body: { checkInId: string }
 * Returns: { checkIn: {...}, status: string, score?: number, analysis?: {...} }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { checkInId } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.error('[Proxy] No Authorization header provided');
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    if (!checkInId) {
      console.error('[Proxy] No checkInId provided in body');
      return res.status(400).json({ error: 'checkInId is required in request body' });
    }

    console.log('[Proxy] Getting check-in status:', checkInId);

    // Get Assessment Engine API URL from environment
    const apiUrl = process.env.ASSESSMENT_ENGINE_API_URL || 'https://4yxzfv4cr3.execute-api.eu-west-2.amazonaws.com/prod';
    const endpoint = `${apiUrl}/checkins/${checkInId}`;

    console.log('[Proxy] Forwarding to:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    const responseText = await response.text();
    console.log('[Proxy] Assessment Engine response status:', response.status);
    console.log('[Proxy] Assessment Engine response:', responseText.substring(0, 200));

    if (!response.ok) {
      console.error('[Proxy] Assessment Engine error:', responseText);
      return res.status(response.status).json({
        error: 'Assessment Engine API error',
        details: responseText
      });
    }

    const data = JSON.parse(responseText);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    return res.status(200).json(data);

  } catch (error) {
    console.error('[Proxy] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
