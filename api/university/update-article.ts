// API: Update/Edit Article in Aurora
// Purpose: University admin can modify their deployed articles

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
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { articleId, universityId, title, excerpt, content, category, coverImage, status } = req.body;

  if (!articleId || !universityId) {
    return res.status(400).json({ error: 'articleId and universityId are required' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // 1. Verify article belongs to this university
    const checkResult = await client.query(
      `SELECT id, source FROM content_articles WHERE id = $1 AND university_id = $2`,
      [articleId, universityId]
    );

    if (checkResult.rows.length === 0) {
      await client.end();
      return res.status(404).json({ error: 'Article not found or does not belong to this university' });
    }

    // 2. Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (excerpt !== undefined) {
      updates.push(`excerpt = $${paramIndex++}`);
      values.push(excerpt);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (coverImage !== undefined) {
      updates.push(`featured_image = $${paramIndex++}`);
      values.push(coverImage);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      if (status === 'published') {
        updates.push(`published_at = NOW()`);
      }
    }
    if (category !== undefined) {
      // Get or create category
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
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [category, `${category} resources`, '#3b82f6', 'book']
          );
          categoryId = newCategory.rows[0].id;
        }
      }
      updates.push(`category_id = $${paramIndex++}`);
      values.push(categoryId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(articleId); // For WHERE clause

    if (updates.length === 0) {
      await client.end();
      return res.status(400).json({ error: 'No fields to update' });
    }

    // 3. Execute update
    const updateQuery = `
      UPDATE content_articles
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, title, status, source, updated_at
    `;

    const result = await client.query(updateQuery, values);

    await client.end();

    return res.status(200).json({
      success: true,
      message: 'Article updated successfully',
      article: result.rows[0],
    });

  } catch (error: any) {
    console.error('Update article error:', error);
    try {
      await client.end();
    } catch {}
    return res.status(500).json({ 
      error: 'Failed to update article',
      details: error.message 
    });
  }
}
