import { VercelRequest, VercelResponse } from '@vercel/node';
import pkg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
const { Client } = pkg;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client({
    host: process.env.AWS_AURORA_HOST,
    port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
    database: process.env.AWS_AURORA_DATABASE,
    user: process.env.AWS_AURORA_USERNAME,
    password: process.env.AWS_AURORA_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to Aurora');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '012_create_article_views.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration 012...');
    await client.query(migrationSQL);
    console.log('✅ Migration 012 complete');

    return res.status(200).json({ 
      success: true,
      message: 'Migration 012 (article_views table) executed successfully'
    });

  } catch (error) {
    console.error('Migration failed:', error);
    return res.status(500).json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await client.end();
  }
}
