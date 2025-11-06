// API endpoint for testing audit logging
// Medical-grade security implementation

import { VercelRequest, VercelResponse } from '@vercel/node';
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    const { action, userId, userEmail, resource, details } = req.body;

    if (!action || !userId || !resource) {
      return res.status(400).json({ 
        error: 'Missing required fields: action, userId, resource' 
      });
    }

    // Insert audit log entry
    const auditEntry = {
      user_id: userId,
      user_email: userEmail || userId,
      action: action,
      resource: resource,
      details: details || {},
      ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'Unknown',
      success: true,
      risk_level: calculateRiskLevel(action),
      compliance_flags: getComplianceFlags(action, resource)
    };

    const insertQuery = `
      INSERT INTO audit_logs (
        user_id, user_email, action, resource, details, 
        ip_address, user_agent, success, risk_level, compliance_flags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, timestamp
    `;

    const values = [
      auditEntry.user_id,
      auditEntry.user_email,
      auditEntry.action,
      auditEntry.resource,
      JSON.stringify(auditEntry.details),
      auditEntry.ip_address,
      auditEntry.user_agent,
      auditEntry.success,
      auditEntry.risk_level,
      auditEntry.compliance_flags
    ];

    const result = await client.query(insertQuery, values);
    
    res.status(200).json({
      success: true,
      auditLogId: result.rows[0].id,
      timestamp: result.rows[0].timestamp,
      message: 'Audit log entry created successfully'
    });

  } catch (error: any) {
    console.error('Audit log creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await client.end();
  }
}

function calculateRiskLevel(action: string): string {
  if (action.includes('SECURITY') || action.includes('BREACH')) return 'CRITICAL';
  if (action.includes('DELETE') || action.includes('PHI_BULK')) return 'HIGH';
  if (action.includes('PHI') || action.includes('ADMIN')) return 'MEDIUM';
  return 'LOW';
}

function getComplianceFlags(action: string, resource: string): string[] {
  const flags: string[] = [];
  
  if (resource === 'phi_data' || action.includes('PHI')) {
    flags.push('HIPAA_RELEVANT');
  }
  
  if (action.includes('DELETE') || action.includes('EXPORT')) {
    flags.push('GDPR_RELEVANT');
  }
  
  if (action.includes('ADMIN') || action.includes('CONFIG')) {
    flags.push('SOC2_RELEVANT');
  }
  
  return flags;
}
