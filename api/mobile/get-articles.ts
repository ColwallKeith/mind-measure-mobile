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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(getAuroraConfig());

  try {
    const { universityId } = req.query;

    if (!universityId || typeof universityId !== 'string') {
      return res.status(400).json({ error: 'universityId is required' });
    }

    await client.connect();

    // Get articles with category names via JOIN
    const result = await client.query(`
      SELECT 
        a.id,
        a.title,
        a.excerpt,
        a.content,
        a.featured_image,
        a.author,
        a.read_time,
        a.published_at,
        a.status,
        c.name as category_name,
        c.slug as category_slug
      FROM content_articles a
      LEFT JOIN content_categories c ON a.category_id = c.id
      WHERE a.university_id = $1 
        AND a.status = 'published'
        AND a.source = 'imported'
      ORDER BY a.published_at DESC
    `, [universityId]);

    const articles = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      featured_image: row.featured_image,
      author: row.author,
      read_time: row.read_time,
      published_at: row.published_at,
      status: row.status,
      category: {
        name: row.category_name,
        slug: row.category_slug
      }
    }));

    return res.status(200).json({ success: true, articles });

  } catch (error: any) {
    console.error('Error fetching articles:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch articles' });
  } finally {
    await client.end();
  }
}
