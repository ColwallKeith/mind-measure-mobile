import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client({
    host: process.env.AWS_AURORA_HOST || process.env.AWS_RDS_HOST,
    port: parseInt(process.env.AWS_AURORA_PORT || process.env.AWS_RDS_PORT || '5432'),
    database: process.env.AWS_AURORA_DATABASE || process.env.AWS_RDS_DATABASE,
    user: process.env.AWS_AURORA_USERNAME || process.env.AWS_RDS_USERNAME,
    password: process.env.AWS_AURORA_PASSWORD || process.env.AWS_RDS_PASSWORD,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    
    console.log('Connected to Aurora. Running migration...');
    
    // Add column if it doesn't exist
    await client.query(`
      ALTER TABLE universities 
      ADD COLUMN IF NOT EXISTS wellbeing_support_url TEXT;
    `);
    
    console.log('Column added successfully');
    
    // Set Worcester's wellbeing URL
    const result = await client.query(`
      UPDATE universities 
      SET wellbeing_support_url = $1
      WHERE id = $2
      RETURNING id, name, wellbeing_support_url;
    `, ['https://studentservices.on.worc.ac.uk/firstpoint/', 'worcester']);
    
    console.log('Worcester URL updated:', result.rows[0]);
    
    await client.end();
    
    return res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      updated: result.rows[0]
    });
  } catch (error: any) {
    console.error('Migration failed:', error);
    await client.end().catch(() => {});
    return res.status(500).json({
      error: 'Migration failed',
      message: error.message,
      details: error.stack
    });
  }
}
