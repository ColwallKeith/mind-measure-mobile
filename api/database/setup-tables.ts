// API endpoint to set up required database tables
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
  connectionTimeoutMillis: 10000,
};

const createTablesSQL = `
-- Universities table
CREATE TABLE IF NOT EXISTS universities (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  slug VARCHAR(100) UNIQUE,
  website VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  postcode VARCHAR(20),
  total_students INTEGER DEFAULT 0,
  undergraduate_students INTEGER DEFAULT 0,
  postgraduate_students INTEGER DEFAULT 0,
  international_students INTEGER DEFAULT 0,
  mature_students INTEGER DEFAULT 0,
  male_students INTEGER DEFAULT 0,
  female_students INTEGER DEFAULT 0,
  non_binary_students INTEGER DEFAULT 0,
  students_over_25 INTEGER DEFAULT 0,
  established INTEGER,
  primary_color VARCHAR(20) DEFAULT '#0BA66D',
  secondary_color VARCHAR(20),
  logo TEXT,
  logo_dark TEXT,
  campus_image TEXT,
  authorized_domains TEXT[],
  authorized_emails TEXT[],
  status VARCHAR(20) DEFAULT 'active',
  current_uptake_rate DECIMAL(8,2) DEFAULT 0,
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  mental_health_services JSONB DEFAULT '[]'::jsonb,
  local_resources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table (users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  university_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessment sessions table
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_data JSONB,
  score INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fusion outputs table
CREATE TABLE IF NOT EXISTS fusion_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  score INTEGER,
  analysis JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost tracking table
CREATE TABLE IF NOT EXISTS cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type VARCHAR(50),
  operation_type VARCHAR(100),
  cost_usd DECIMAL(10,6),
  tokens_used INTEGER,
  model_used VARCHAR(100),
  user_id UUID,
  university_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Insert sample universities
INSERT INTO universities (id, name, status, current_uptake_rate, total_students) 
VALUES 
  ('worcester', 'University of Worcester', 'active', 8.50, 15000),
  ('lse', 'London School of Economics', 'planning', 0, 12000)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  current_uptake_rate = EXCLUDED.current_uptake_rate,
  total_students = EXCLUDED.total_students,
  updated_at = CURRENT_TIMESTAMP;
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(dbConfig);

  try {
    console.log('Connecting to Aurora Serverless to set up tables...');
    await client.connect();

    console.log('Creating tables...');
    await client.query(createTablesSQL);

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    await client.end();

    return res.status(200).json({
      success: true,
      message: 'Database tables created successfully',
      tables: tablesResult.rows.map((row: any) => row.table_name)
    });

  } catch (error: any) {
    console.error('Database setup failed:', error);

    try {
      await client.end();
    } catch (endError) {
      console.error('Error closing client:', endError);
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
      }
    });
  }
}
