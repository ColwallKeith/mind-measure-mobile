// API: Import Article from Central Library to University
// Purpose: Copy article from Marketing CMS → Aurora for a specific university

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

  const { sourceArticleId, universityId } = req.body;

  if (!sourceArticleId || !universityId) {
    return res.status(400).json({ 
      error: 'sourceArticleId and universityId are required' 
    });
  }

  const client = new Client(dbConfig);

  try {
    // 1. Fetch article from Marketing CMS public API
    console.log(`Fetching article ${sourceArticleId} from Marketing CMS...`);
    const response = await fetch(
      `https://marketing.mindmeasure.co.uk/api/public/library/${sourceArticleId}`
    );

    if (!response.ok) {
      return res.status(404).json({ error: 'Article not found in central library' });
    }

    const { article } = await response.json();

    // 2. Connect to Aurora
    await client.connect();
    console.log('Connected to Aurora');

    // 3. Check if category exists, create if not
    let categoryId = null;
    if (article.category) {
      const categoryCheck = await client.query(
        `SELECT id FROM content_categories WHERE name = $1`,
        [article.category]
      );

      if (categoryCheck.rows.length > 0) {
        categoryId = categoryCheck.rows[0].id;
      } else {
        const newCategory = await client.query(
          `INSERT INTO content_categories (name, description, color, icon)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [article.category, `${article.category} resources`, '#3b82f6', 'book']
        );
        categoryId = newCategory.rows[0].id;
      }
    }

    // 4. Check if article already imported
    const existingCheck = await client.query(
      `SELECT id FROM content_articles 
       WHERE university_id = $1 AND source_article_id = $2`,
      [universityId, sourceArticleId]
    );

    if (existingCheck.rows.length > 0) {
      await client.end();
      return res.status(409).json({ 
        error: 'Article already imported',
        articleId: existingCheck.rows[0].id 
      });
    }

    // 5. Insert article into Aurora
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
      RETURNING id`,
      [
        universityId,
        article.title,
        article.excerpt || '',
        article.contentMd || '',
        article.coverImageUrl || null,
        'published', // Immediately published
        false, // Not featured by default
        article.publishedAt || new Date(),
        categoryId,
        'imported', // Mark as imported
        sourceArticleId, // Link to source
      ]
    );

    const newArticleId = insertResult.rows[0].id;
    console.log(`Imported article ${newArticleId} for university ${universityId}`);

    await client.end();

    return res.status(200).json({
      success: true,
      message: 'Article imported successfully',
      articleId: newArticleId,
      source: 'imported',
    });

  } catch (error: any) {
    console.error('Import error:', error);
    try {
      await client.end();
    } catch {}
    return res.status(500).json({ 
      error: 'Failed to import article',
      details: error.message 
    });
  }
}
