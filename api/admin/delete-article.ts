import { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

const getAuroraConfig = () => ({
  host: process.env.AWS_AURORA_HOST || 'mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com',
  port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
  database: process.env.AWS_AURORA_DATABASE || 'mindmeasure',
  user: process.env.AWS_AURORA_USERNAME || 'mindmeasure_admin',
  password: process.env.AWS_AURORA_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(getAuroraConfig());

  try {
    const { articleId } = req.query;

    if (!articleId || typeof articleId !== 'string') {
      return res.status(400).json({ error: 'articleId is required' });
    }

    await client.connect();

    // Delete the article
    const result = await client.query(
      'DELETE FROM content_articles WHERE id = $1 RETURNING title',
      [articleId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    return res.status(200).json({ 
      success: true, 
      message: `Article "${result.rows[0].title}" deleted successfully` 
    });

  } catch (error: any) {
    console.error('Error deleting article:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete article' });
  } finally {
    await client.end();
  }
}
