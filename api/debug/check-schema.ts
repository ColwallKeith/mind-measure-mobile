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
    
    // Get schema for content_articles
    const articlesSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'content_articles'
      ORDER BY ordinal_position;
    `);
    
    // Get schema for content_categories
    const categoriesSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'content_categories'
      ORDER BY ordinal_position;
    `);
    
    await client.end();
    
    return res.status(200).json({
      content_articles: articlesSchema.rows,
      content_categories: categoriesSchema.rows
    });
  } catch (error: any) {
    console.error('Schema check failed:', error);
    await client.end().catch(() => {});
    return res.status(500).json({
      error: 'Schema check failed',
      message: error.message
    });
  }
}
