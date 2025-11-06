// API endpoint to test Aurora Serverless connection
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
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000, // 5 second timeout
  idleTimeoutMillis: 10000, // 10 second idle timeout
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET requests for health checks
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(dbConfig);
  const startTime = Date.now();

  try {
    console.log('Attempting to connect to Aurora Serverless...');
    console.log('Config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      // Don't log password
    });

    await client.connect();
    console.log('Connected successfully');

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    const connectionTime = Date.now() - startTime;

    await client.end();

    return res.status(200).json({
      status: 'healthy',
      connectionTime: `${connectionTime}ms`,
      database: {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].db_version,
      },
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
      }
    });

  } catch (error: any) {
    const connectionTime = Date.now() - startTime;
    console.error('Database connection failed:', error);

    try {
      await client.end();
    } catch (endError) {
      console.error('Error closing client:', endError);
    }

    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      connectionTime: `${connectionTime}ms`,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
      },
      details: {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
      }
    });
  }
}
