/**
 * SECURED Generic Database SELECT Endpoint
 * 
 * Security measures:
 * - JWT authentication required
 * - Table allowlist (only safe tables)
 * - Automatic user scoping (users can only see their own data)
 * - Read-only (SELECT only)
 * 
 * This is a TEMPORARY bridge to keep the app working while we migrate
 * to task-specific endpoints. DO NOT add new features using this endpoint.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth-middleware';
import { setCorsHeaders, handleCorsPreflightIfNeeded } from '../_lib/cors-config';
import { Client } from 'pg';

// STRICT TABLE ALLOWLIST - Only tables that are safe for user access
const ALLOWED_TABLES = new Set([
  'profiles',
  'fusion_outputs',
  'assessment_sessions',
  'assessment_transcripts',
  'assessment_items',
  'weekly_summary',
  'universities',
  'help_resources',
  'content_blocks',
  'wellbeing_reports',
  'buddy_contacts',  // User's emergency support contacts
  'content_articles',  // Published content for students
  'content_categories'  // Content categories
]);

// Tables that require user_id scoping (everything except public data)
const PUBLIC_TABLES = new Set([
  'universities',
  'help_resources',
  'content_blocks',
  'content_articles',
  'content_categories'
]);

interface SelectRequest {
  table: string;
  filters?: Record<string, any>;
  columns?: string;
  orderBy?: Array<{ column: string; ascending: boolean }>;
  limit?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  const auth = await requireAuth(req, res);
  if (!auth) return; // 401 already sent

  const { userId } = auth;

  try {
    const { table, filters = {}, columns = '*', orderBy, limit }: SelectRequest = req.body;

    // Validate table is in allowlist
    if (!table || !ALLOWED_TABLES.has(table)) {
      console.warn(`[SECURITY] User ${userId} attempted to access non-allowed table: ${table}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: `Table '${table}' is not accessible through this endpoint`,
        code: 'TABLE_NOT_ALLOWED'
      });
    }

    // Auto-scope to authenticated user (unless it's a public table)
    if (!PUBLIC_TABLES.has(table)) {
      // Force user_id filter for non-public tables
      filters.user_id = userId;
    }

    // Build query
    const client = new Client({
      host: process.env.AWS_AURORA_HOST,
      port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
      database: process.env.AWS_AURORA_DATABASE,
      user: process.env.AWS_AURORA_USERNAME,
      password: process.env.AWS_AURORA_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    let sql = `SELECT ${columns} FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    // Add WHERE clause
    if (filters && Object.keys(filters).length > 0) {
      const whereConditions: string[] = [];
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && typeof value === 'object' && 'in' in value) {
          const placeholders = value.in.map((_: any) => `$${paramIndex++}`).join(',');
          whereConditions.push(`${key} IN (${placeholders})`);
          params.push(...value.in);
        } else if (value && typeof value === 'object' && 'eq' in value) {
          whereConditions.push(`${key} = $${paramIndex++}`);
          params.push(value.eq);
        } else {
          whereConditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      });

      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (orderBy && orderBy.length > 0) {
      const orderClauses = orderBy.map(order => 
        `${order.column} ${order.ascending ? 'ASC' : 'DESC'}`
      );
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Add LIMIT
    if (limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(limit);
    }

    console.log(`[DB SELECT] User ${userId} querying ${table} (${params.length} params)`);

    const result = await client.query(sql, params);
    await client.end();

    return res.status(200).json({
      data: result.rows,
      error: null
    });

  } catch (error: any) {
    console.error(`[DB SELECT] Error for user ${userId}:`, error);
    return res.status(500).json({
      error: 'Database query failed',
      message: error.message,
      data: null
    });
  }
}
