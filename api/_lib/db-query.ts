/**
 * Server-Side Database Query Utility
 * For use by API endpoints only - NOT exposed to clients
 */

import { Client } from 'pg';
import { getSecureDbConfig } from './db-config';

export async function queryDatabase(sql: string, params: any[] = []): Promise<any[]> {
  const client = new Client(getSecureDbConfig());
  
  try {
    await client.connect();
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

export async function selectFromTable(table: string, filters?: Record<string, any>, select?: string, limit?: number): Promise<any[]> {
  const client = new Client(getSecureDbConfig());
  
  try {
    await client.connect();
    
    const columns = select || '*';
    let sql = `SELECT ${columns} FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters && Object.keys(filters).length > 0) {
      const whereConditions: string[] = [];
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && typeof value === 'object' && 'in' in value) {
          const placeholders = value.in.map((_: any) => `$${paramIndex++}`).join(',');
          whereConditions.push(`${key} IN (${placeholders})`);
          params.push(...value.in);
        } else {
          whereConditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      });

      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    if (limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(limit);
    }

    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}
