import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
    
    // Get all articles with full details
    const result = await client.query(`
      SELECT 
        a.id, 
        a.title, 
        a.excerpt,
        a.status, 
        a.university_id, 
        a.published_at, 
        a.created_at, 
        a.category_id,
        c.name as category_name
      FROM content_articles a
      LEFT JOIN content_categories c ON a.category_id = c.id
      ORDER BY a.created_at DESC
      LIMIT 10;
    `);
    
    // Get categories
    const categories = await client.query(`
      SELECT id, name, description FROM content_categories;
    `);
    
    await client.end();
    
    return res.status(200).json({
      articles: result.rows,
      article_count: result.rows.length,
      categories: categories.rows
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
