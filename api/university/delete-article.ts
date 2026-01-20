// API: Delete Article from Aurora
// Purpose: University admin can remove deployed articles

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
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { articleId, universityId } = req.body;

  if (!articleId || !universityId) {
    return res.status(400).json({ error: 'articleId and universityId are required' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // 1. Verify article belongs to this university
    const checkResult = await client.query(
      `SELECT id, title, source FROM content_articles WHERE id = $1 AND university_id = $2`,
      [articleId, universityId]
    );

    if (checkResult.rows.length === 0) {
      await client.end();
      return res.status(404).json({ error: 'Article not found or does not belong to this university' });
    }

    const article = checkResult.rows[0];

    // 2. Delete article
    await client.query(
      `DELETE FROM content_articles WHERE id = $1`,
      [articleId]
    );

    await client.end();

    return res.status(200).json({
      success: true,
      message: 'Article deleted successfully',
      deletedArticle: {
        id: article.id,
        title: article.title,
        source: article.source,
      },
    });

  } catch (error: any) {
    console.error('Delete article error:', error);
    try {
      await client.end();
    } catch {}
    return res.status(500).json({ 
      error: 'Failed to delete article',
      details: error.message 
    });
  }
}
