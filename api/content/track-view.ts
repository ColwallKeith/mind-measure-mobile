import { VercelRequest, VercelResponse } from '@vercel/node';
import pkg from 'pg';
const { Client } = pkg;

/**
 * Track Article View API
 * Records a view event for analytics and popularity ranking
 * 
 * POST /api/content/track-view
 * Body: { articleId, userId?, universityId }
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { articleId, userId, universityId } = req.body;

  // Validate required fields
  if (!articleId) {
    return res.status(400).json({ error: 'articleId is required' });
  }

  const client = new Client({
    host: process.env.AWS_AURORA_HOST,
    port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
    database: process.env.AWS_AURORA_DATABASE,
    user: process.env.AWS_AURORA_USERNAME,
    password: process.env.AWS_AURORA_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();

    // Insert view event
    await client.query(
      `INSERT INTO article_views (article_id, user_id, university_id, viewed_at)
       VALUES ($1, $2, $3, NOW())`,
      [articleId, userId || null, universityId || null]
    );

    // Increment view_count in content_articles
    await client.query(
      `UPDATE content_articles 
       SET view_count = view_count + 1 
       WHERE id = $1`,
      [articleId]
    );

    return res.status(200).json({ 
      success: true,
      message: 'View tracked successfully'
    });

  } catch (error) {
    console.error('[Track View Error]', error);
    return res.status(500).json({ 
      error: 'Failed to track view',
      details: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await client.end();
  }
}
