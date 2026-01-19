/**
 * DEBUG ENDPOINT - Test Database Connection
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';
import { Client } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = {
      host: process.env.AWS_AURORA_HOST,
      port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
      database: process.env.AWS_AURORA_DATABASE,
      user: process.env.AWS_AURORA_USERNAME,
      password: process.env.AWS_AURORA_PASSWORD,
      ssl: {
        rejectUnauthorized: true
      }
    };

    const client = new Client(config);
    await client.connect();
    const result = await client.query('SELECT COUNT(*) FROM fusion_outputs');
    await client.end();

    return res.status(200).json({
      success: true,
      count: result.rows[0].count
    });

  } catch (error: any) {
    return res.status(500).json({
      error: 'Database connection failed',
      message: error.message,
      code: error.code
    });
  }
}
