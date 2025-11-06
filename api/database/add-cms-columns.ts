// API endpoint to add missing CMS columns to universities table
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

const addColumnsSQL = `
-- Add missing CMS columns to universities table
ALTER TABLE universities 
ADD COLUMN IF NOT EXISTS undergraduate_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS postgraduate_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS international_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mature_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS male_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS female_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS non_binary_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS students_over_25 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS established INTEGER,
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#0BA66D',
ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20),
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS logo_dark TEXT,
ADD COLUMN IF NOT EXISTS campus_image TEXT,
ADD COLUMN IF NOT EXISTS authorized_domains TEXT[],
ADD COLUMN IF NOT EXISTS authorized_emails TEXT[],
ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS mental_health_services JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS local_resources JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postcode VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS target_uptake_rate DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS launch_date DATE,
ADD COLUMN IF NOT EXISTS mind_measure_contact TEXT,
ADD COLUMN IF NOT EXISTS mind_measure_email TEXT;

-- Fix current_uptake_rate column type
ALTER TABLE universities 
ALTER COLUMN current_uptake_rate TYPE DECIMAL(8,2);
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(dbConfig);

  try {
    console.log('Connecting to Aurora Serverless v2...');
    await client.connect();
    
    console.log('Adding missing CMS columns...');
    await client.query(addColumnsSQL);
    
    console.log('CMS columns added successfully');
    
    res.status(200).json({
      success: true,
      message: 'CMS columns added to universities table successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Add columns error:', error);
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
