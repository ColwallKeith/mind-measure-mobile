import { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let auroraClient: Client | null = null;

  try {
    const { universityId = 'worcester' } = req.query;

    // Connect to Aurora using same pattern as working endpoints
    auroraClient = new Client({
      host: process.env.AWS_AURORA_HOST,
      port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
      database: process.env.AWS_AURORA_DATABASE,
      user: process.env.AWS_AURORA_USERNAME,
      password: process.env.AWS_AURORA_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });
    
    await auroraClient.connect();

    // Fetch university nudges
    const result = await auroraClient.query(
      `SELECT id, name, nudges FROM universities WHERE id = $1`,
      [universityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'University not found',
        universityId 
      });
    }

    const university = result.rows[0];
    const nudges = university.nudges || [];

    return res.status(200).json({
      success: true,
      universityId: university.id,
      universityName: university.name,
      nudgesCount: nudges.length,
      nudges: nudges,
      activeCount: nudges.filter((n: any) => n.status === 'active').length,
      pinnedCount: nudges.filter((n: any) => n.isPinned).length,
    });
  } catch (error: any) {
    console.error('Error in nudges debug:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch nudges',
      stack: error.stack 
    });
  } finally {
    if (auroraClient) {
      await auroraClient.end();
    }
  }
}
