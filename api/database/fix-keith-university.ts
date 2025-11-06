import type { NextApiRequest, NextApiResponse } from 'next';
import { Client } from 'pg';

const dbConfig = {
  host: process.env.RDS_HOST || 'mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com',
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE || 'mindmeasure',
  user: process.env.RDS_USERNAME || 'mindmeasure_admin',
  password: process.env.RDS_PASSWORD || 'MindMeasure2024!',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Update Keith's profile to use Worcester
    const updateQuery = `
      UPDATE profiles 
      SET university_id = 'worcester', updated_at = NOW()
      WHERE email = 'keith@dicestudio.com'
      RETURNING id, email, university_id;
    `;
    
    const result = await client.query(updateQuery);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Updated Keith\'s university to Worcester:', result.rows[0]);

    // Also clean up any Manchester data
    const cleanupQuery = `
      DELETE FROM universities WHERE id = 'manchester';
      DELETE FROM universities WHERE id = 'birmingham';
    `;
    
    await client.query(cleanupQuery);
    console.log('✅ Cleaned up other university data');

    res.status(200).json({ 
      success: true, 
      user: result.rows[0],
      message: 'Keith\'s university updated to Worcester and other universities removed'
    });

  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({ 
      error: 'Database operation failed',
      details: (error as Error).message 
    });
  } finally {
    await client.end();
  }
}
