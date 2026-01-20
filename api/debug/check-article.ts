import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { articleId } = req.query;

  const client = new Client({
    host: process.env.AWS_AURORA_HOST || process.env.AWS_RDS_HOST,
    port: parseInt(process.env.AWS_AURORA_PORT || process.env.AWS_RDS_PORT || '5432'),
    database: process.env.AWS_AURORA_DATABASE || process.env.AWS_RDS_DATABASE,
    user: process.env.AWS_AURORA_USERNAME || process.env.AWS_RDS_USERNAME,
    password: process.env.AWS_AURORA_PASSWORD || process.env.AWS_RDS_PASSWORD,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    
    // Check if article exists
    const result = await client.query(`
      SELECT 
        id, title, slug, status, university_id, 
        published_at, created_at, category_id
      FROM content_articles 
      WHERE slug LIKE $1 OR id::text = $1
      LIMIT 5;
    `, [articleId || '%']);
    
    // Also check total count
    const countResult = await client.query(`
      SELECT 
        university_id,
        status,
        COUNT(*) as count
      FROM content_articles 
      GROUP BY university_id, status;
    `);
    
    await client.end();
    
    return res.status(200).json({
      article: result.rows,
      summary: countResult.rows,
      note: articleId ? `Searched for article: ${articleId}` : 'Showing all articles'
    });
  } catch (error: any) {
    console.error('Check failed:', error);
    await client.end().catch(() => {});
    return res.status(500).json({
      error: 'Check failed',
      message: error.message
    });
  }
}
