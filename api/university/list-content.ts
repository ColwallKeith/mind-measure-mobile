// API: List University's Content (Imported + Original)
// Purpose: Show university admin their deployed articles with source type

import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import { Client } from 'pg';

const dbConfig = {
  host: process.env.AWS_AURORA_HOST || 'mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com',
  port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
  database: process.env.AWS_AURORA_DATABASE || 'mindmeasure',
  user: process.env.AWS_AURORA_USERNAME || 'mindmeasure_admin',
  password: process.env.AWS_AURORA_PASSWORD,
  ssl: { rejectUnauthorized: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { universityId } = req.query;

  if (!universityId || typeof universityId !== 'string') {
    return res.status(400).json({ error: 'universityId is required' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // Get all articles for this university with category info
    const result = await client.query(
      `SELECT 
        a.id,
        a.title,
        a.excerpt,
        a.status,
        a.source,
        a.source_article_id,
        a.is_featured,
        a.published_at,
        a.created_at,
        a.updated_at,
        c.name as category_name,
        c.color as category_color
      FROM content_articles a
      LEFT JOIN content_categories c ON a.category_id = c.id
      WHERE a.university_id = $1
      ORDER BY a.created_at DESC`,
      [universityId]
    );

    // Separate into imported vs original
    const imported = result.rows.filter(a => a.source === 'imported');
    const original = result.rows.filter(a => a.source === 'original');

    await client.end();

    return res.status(200).json({
      success: true,
      imported,
      original,
      total: result.rows.length,
    });

  } catch (error: any) {
    console.error('List content error:', error);
    try {
      await client.end();
    } catch {}
    return res.status(500).json({ 
      error: 'Failed to list content',
      details: error.message 
    });
  }
}
