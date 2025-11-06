// API endpoint for database UPDATE operations
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

  const { table, data, filters, options } = req.body;

  if (!table || !data || !filters) {
    return res.status(400).json({ error: 'Table name, data, and filters are required' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // Build UPDATE query
    const updateColumns = Object.keys(data);
    const updateValues = Object.values(data);
    
    const setClause = updateColumns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    
    let paramIndex = updateValues.length + 1;
    const whereConditions: string[] = [];
    const allParams = [...updateValues];

    // Build WHERE clause
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const placeholders = value.map(() => `$${paramIndex++}`).join(',');
        whereConditions.push(`${key} IN (${placeholders})`);
        allParams.push(...value);
      } else {
        whereConditions.push(`${key} = $${paramIndex++}`);
        allParams.push(value);
      }
    });

    let sql = `UPDATE ${table} SET ${setClause} WHERE ${whereConditions.join(' AND ')}`;
    
    // Add RETURNING clause if specified
    if (options?.returning) {
      sql += ` RETURNING ${options.returning}`;
    } else {
      sql += ` RETURNING *`;
    }

    console.log('Executing SQL:', sql, 'with params:', allParams);

    const result = await client.query(sql, allParams);

    res.status(200).json({
      data: result.rows[0] || null,
      error: null
    });

  } catch (error: any) {
    console.error('Database update error:', error);
    res.status(500).json({
      data: null,
      error: error.message
    });
  } finally {
    await client.end();
  }
}
