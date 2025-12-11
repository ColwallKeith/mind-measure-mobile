// API endpoint for database INSERT operations
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
  password: process.env.AWS_AURORA_PASSWORD || process.env.AWS_RDS_PASSWORD || 'K31th50941964!',
  ssl: { rejectUnauthorized: false }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers for Capacitor
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { table, data, options } = req.body;

  if (!table || !data) {
    return res.status(400).json({ error: 'Table name and data are required' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // Handle single record or array of records
    const records = Array.isArray(data) ? data : [data];
    const results = [];

    for (const record of records) {
      const columns = Object.keys(record);
      // Serialize arrays/objects to JSON strings for JSONB columns
      const values = Object.values(record).map(value => {
        if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Date))) {
          return JSON.stringify(value);
        }
        return value;
      });
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      // Add RETURNING clause if specified
      if (options?.returning) {
        sql += ` RETURNING ${options.returning}`;
      } else {
        sql += ` RETURNING *`;
      }

      // Handle ON CONFLICT if specified
      if (options?.onConflict) {
        sql += ` ${options.onConflict}`;
      }

      console.log('Executing SQL:', sql, 'with values:', values);

      const result = await client.query(sql, values);
      results.push(result.rows[0]);
    }

    res.status(200).json({
      data: Array.isArray(data) ? results : results[0],
      error: null
    });

  } catch (error: any) {
    console.error('Database insert error:', error);
    res.status(500).json({
      data: null,
      error: error.message
    });
  } finally {
    await client.end();
  }
}
