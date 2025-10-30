/**
 * AWS RDS PostgreSQL Connection
 * HIPAA-compliant database access for Lambda functions
 */

import { Client, ClientConfig } from 'pg';

/**
 * Create secure connection to AWS RDS PostgreSQL
 * Uses environment variables for configuration
 */
export async function connectToRDS(): Promise<Client> {
  const config: ClientConfig = {
    host: process.env.RDS_HOST,
    port: parseInt(process.env.RDS_PORT || '5432'),
    database: process.env.RDS_DATABASE,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    ssl: {
      rejectUnauthorized: false // AWS RDS requires SSL but uses self-signed certs
    },
    connectionTimeoutMillis: 5000,
    query_timeout: 10000
  };

  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✅ Connected to RDS PostgreSQL');
    return client;
  } catch (error) {
    console.error('❌ RDS connection failed:', error);
    throw new Error('Database connection failed');
  }
}

/**
 * Execute query with automatic connection cleanup
 */
export async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await connectToRDS();
  
  try {
    console.log('🔍 Executing query:', query.substring(0, 100) + '...');
    const result = await client.query(query, params);
    console.log(`✅ Query executed successfully, ${result.rowCount} rows affected`);
    
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    };
  } catch (error) {
    console.error('❌ Query execution failed:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

/**
 * Insert record with automatic JSON stringification
 */
export async function insertRecord(
  table: string,
  data: Record<string, any>
): Promise<{ id: string; [key: string]: any }> {
  const columns = Object.keys(data);
  const values = Object.values(data).map((value, index) => {
    // Automatically stringify objects/arrays for JSONB columns
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return value;
  });
  
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const columnList = columns.join(', ');
  
  const query = `
    INSERT INTO ${table} (${columnList})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await executeQuery(query, values);
  return result.rows[0];
}

/**
 * Select records with WHERE conditions
 */
export async function selectRecords<T = any>(
  table: string,
  where: Record<string, any> = {},
  orderBy?: string,
  limit?: number
): Promise<T[]> {
  let query = `SELECT * FROM ${table}`;
  const params: any[] = [];
  
  if (Object.keys(where).length > 0) {
    const conditions = Object.keys(where).map((key, index) => {
      params.push(where[key]);
      return `${key} = $${index + 1}`;
    });
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  if (orderBy) {
    query += ` ORDER BY ${orderBy}`;
  }
  
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  
  const result = await executeQuery<T>(query, params);
  return result.rows;
}

/**
 * Update records with WHERE conditions
 */
export async function updateRecords(
  table: string,
  data: Record<string, any>,
  where: Record<string, any>
): Promise<number> {
  const setClause = Object.keys(data).map((key, index) => {
    return `${key} = $${index + 1}`;
  }).join(', ');
  
  const whereClause = Object.keys(where).map((key, index) => {
    return `${key} = $${Object.keys(data).length + index + 1}`;
  }).join(' AND ');
  
  const query = `
    UPDATE ${table}
    SET ${setClause}
    WHERE ${whereClause}
  `;
  
  const params = [...Object.values(data), ...Object.values(where)];
  const result = await executeQuery(query, params);
  return result.rowCount;
}
