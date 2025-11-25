// API endpoint for database SELECT operations
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - pg types not available in Vercel environment
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

  const { table, options } = req.body;

  if (!table) {
    return res.status(400).json({ error: 'Table name is required' });
  }

  const client = new Client(dbConfig);

  try {
    // Set connection timeout to prevent hanging
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Database connection timeout'));
      }, 5000); // 5 second timeout
      
      client.connect()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });

    // Build SELECT query
    const columns = options?.columns || '*';
    let sql = `SELECT ${columns} FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (options?.filters && Object.keys(options.filters).length > 0) {
      const whereConditions: string[] = [];
      
      Object.entries(options.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          const placeholders = value.map(() => `$${paramIndex++}`).join(',');
          whereConditions.push(`${key} IN (${placeholders})`);
          params.push(...value);
        } else {
          whereConditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      });

      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Build ORDER BY clause
    if (options?.orderBy && options.orderBy.length > 0) {
      const orderClauses = options.orderBy.map((order: any) => 
        `${order.column} ${order.ascending !== false ? 'ASC' : 'DESC'}`
      );
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Build LIMIT and OFFSET
    if (options?.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    console.log('Executing SQL:', sql, 'with params:', params);

    const result = await client.query(sql, params);

    res.status(200).json({
      data: result.rows,
      count: result.rowCount,
      error: null
    });

  } catch (error: any) {
    console.error('Database select error:', error);
    res.status(500).json({
      data: null,
      error: error.message,
      count: 0
    });
  } finally {
    await client.end();
  }
}
