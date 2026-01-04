// API endpoint to add missing slug column to universities table
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - pg types not available in Vercel environment
import { Client } from 'pg';

// Aurora Serverless v2 configuration
const dbConfig = {
  host: process.env.AWS_AURORA_HOST || process.env.AWS_RDS_HOST || 'mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com',
  port: parseInt(process.env.AWS_AURORA_PORT || process.env.AWS_RDS_PORT || '5432'),
  database: process.env.AWS_AURORA_DATABASE || process.env.AWS_RDS_DATABASE || 'mindmeasure',
  user: process.env.AWS_AURORA_USERNAME || process.env.AWS_RDS_USERNAME || 'mindmeasure_admin',
  password: process.env.AWS_AURORA_PASSWORD || process.env.AWS_RDS_PASSWORD || 'MindMeasure2024!',
  ssl: { rejectUnauthorized: false }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // Add slug column if it doesn't exist
    await client.query(`
      ALTER TABLE universities 
      ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
    `);

    // Update existing records with slugs based on their IDs
    await client.query(`
      UPDATE universities 
      SET slug = id 
      WHERE slug IS NULL;
    `);

    // Add other missing columns that might be needed
    await client.query(`
      ALTER TABLE universities 
      ADD COLUMN IF NOT EXISTS short_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
    `);

    // Update Worcester with proper data
    await client.query(`
      UPDATE universities 
      SET 
        short_name = 'Worcester',
        slug = 'worcester',
        website = 'https://www.worcester.ac.uk',
        contact_email = 'info@worcester.ac.uk'
      WHERE id = 'worcester';
    `);

    // Add LSE record if it doesn't exist
    await client.query(`
      INSERT INTO universities (id, name, short_name, slug, status, total_students, website, contact_email)
      VALUES ('lse', 'London School of Economics', 'LSE', 'lse', 'planning', 12000, 'https://www.lse.ac.uk', 'info@lse.ac.uk')
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.end();

    return res.status(200).json({ 
      success: true, 
      message: 'Universities table updated successfully with slug column and sample data' 
    });

  } catch (error: any) {
    console.error('Database setup error:', error);
    try {
      await client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error 
    });
  }
}
