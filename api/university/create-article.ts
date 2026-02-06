// API: Create Original Article for University
// Purpose: University creates their own private article directly in Aurora

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    universityId, 
    title, 
    excerpt, 
    content, 
    category,
    coverImage,
    status = 'published' 
  } = req.body;

  // Validation
  if (!universityId || !title || !content) {
    return res.status(400).json({ 
      error: 'universityId, title, and content are required' 
    });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // 1. Get or create category
    let categoryId = null;
    if (category) {
      const categoryCheck = await client.query(
        `SELECT id FROM content_categories WHERE name = $1`,
        [category]
      );

      if (categoryCheck.rows.length > 0) {
        categoryId = categoryCheck.rows[0].id;
      } else {
        const newCategory = await client.query(
          `INSERT INTO content_categories (name, description, color, icon)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [category, `${category} resources`, '#3b82f6', 'book']
        );
        categoryId = newCategory.rows[0].id;
      }
    }

    // 2. Insert article into Aurora
    const insertResult = await client.query(
      `INSERT INTO content_articles (
        university_id,
        title,
        excerpt,
        content,
        featured_image,
        status,
        is_featured,
        published_at,
        category_id,
        source,
        source_article_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id, title, status, source`,
      [
        universityId,
        title,
        excerpt || '',
        content,
        coverImage || null,
        status,
        false, // is_featured
        status === 'published' ? new Date() : null,
        categoryId,
        'original', // Mark as original (created by university)
        null, // No source article (not imported)
      ]
    );

    const newArticle = insertResult.rows[0];

    await client.end();

    return res.status(200).json({
      success: true,
      message: 'Article created successfully',
      article: newArticle,
    });

  } catch (error: any) {
    console.error('Create article error:', error);
    try {
      await client.end();
    } catch {}
    return res.status(500).json({ 
      error: 'Failed to create article',
      details: error.message 
    });
  }
}
