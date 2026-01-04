// API endpoint to execute raw SQL commands
// Vercel serverless function - USE WITH CAUTION

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
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sql, description } = req.body;

  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  const client = new Client(dbConfig);

  try {
    console.log(`Executing SQL: ${description || 'Custom query'}`);
    await client.connect();
    
    const result = await client.query(sql);
    
    console.log(`SQL executed successfully. Rows affected: ${result.rowCount}`);
    
    res.status(200).json({
      success: true,
      message: description || 'SQL executed successfully',
      rowCount: result.rowCount,
      rows: result.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('SQL execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  } finally {
    await client.end();
  }
}
