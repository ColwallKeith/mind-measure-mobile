// API endpoint to fix universities table schema
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

const fixUniversitiesSchemaSQL = `
-- Add missing columns to universities table
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

-- Fix current_uptake_rate to handle larger values
ALTER TABLE universities 
ALTER COLUMN current_uptake_rate TYPE DECIMAL(8,2);

-- Update existing records with proper data
UPDATE universities SET 
  undergraduate_students = CASE 
    WHEN id = 'worcester' THEN 8000
    WHEN id = 'lse' THEN 7000
    WHEN id = 'manchester' THEN 25000
    ELSE 0
  END,
  postgraduate_students = CASE 
    WHEN id = 'worcester' THEN 2500
    WHEN id = 'lse' THEN 5000
    WHEN id = 'manchester' THEN 15000
    ELSE 0
  END,
  international_students = CASE 
    WHEN id = 'worcester' THEN 1500
    WHEN id = 'lse' THEN 8000
    WHEN id = 'manchester' THEN 12000
    ELSE 0
  END,
  mature_students = CASE 
    WHEN id = 'worcester' THEN 800
    WHEN id = 'lse' THEN 1200
    WHEN id = 'manchester' THEN 3000
    ELSE 0
  END,
  male_students = CASE 
    WHEN id = 'worcester' THEN 4200
    WHEN id = 'lse' THEN 5400
    WHEN id = 'manchester' THEN 18000
    ELSE 0
  END,
  female_students = CASE 
    WHEN id = 'worcester' THEN 5800
    WHEN id = 'lse' THEN 6000
    WHEN id = 'manchester' THEN 20000
    ELSE 0
  END,
  non_binary_students = CASE 
    WHEN id = 'worcester' THEN 500
    WHEN id = 'lse' THEN 600
    WHEN id = 'manchester' THEN 2000
    ELSE 0
  END,
  established = CASE 
    WHEN id = 'worcester' THEN 2005
    WHEN id = 'lse' THEN 1895
    WHEN id = 'manchester' THEN 1824
    ELSE NULL
  END,
  primary_color = CASE 
    WHEN id = 'worcester' THEN '#1e40af'
    WHEN id = 'lse' THEN '#003d82'
    WHEN id = 'manchester' THEN '#c8102e'
    ELSE '#0BA66D'
  END,
  address = CASE 
    WHEN id = 'worcester' THEN 'Henwick Grove, Worcester'
    WHEN id = 'lse' THEN 'Houghton Street, London'
    WHEN id = 'manchester' THEN 'Oxford Road, Manchester'
    ELSE NULL
  END,
  postcode = CASE 
    WHEN id = 'worcester' THEN 'WR2 6AJ'
    WHEN id = 'lse' THEN 'WC2A 2AE'
    WHEN id = 'manchester' THEN 'M13 9PL'
    ELSE NULL
  END,
  contact_phone = CASE 
    WHEN id = 'worcester' THEN '+44 1905 855000'
    WHEN id = 'lse' THEN '+44 20 7405 7686'
    WHEN id = 'manchester' THEN '+44 161 275 2000'
    ELSE NULL
  END,
  current_uptake_rate = CASE 
    WHEN id = 'worcester' THEN 8.50
    WHEN id = 'lse' THEN 12.30
    WHEN id = 'manchester' THEN 0.00
    ELSE current_uptake_rate
  END,
  target_uptake_rate = CASE 
    WHEN id = 'worcester' THEN 15.00
    WHEN id = 'lse' THEN 20.00
    WHEN id = 'manchester' THEN 10.00
    ELSE 0
  END,
  emergency_contacts = CASE 
    WHEN id = 'worcester' THEN '[{"name": "Student Support Services", "phone": "+44 1905 855000", "email": "support@worcester.ac.uk", "available": "24/7"}]'::jsonb
    WHEN id = 'lse' THEN '[{"name": "Student Services", "phone": "+44 20 7405 7686", "email": "studentservices@lse.ac.uk", "available": "Mon-Fri 9-17"}]'::jsonb
    WHEN id = 'manchester' THEN '[{"name": "Student Support", "phone": "+44 161 275 2000", "email": "studentservices@manchester.ac.uk", "available": "24/7"}]'::jsonb
    ELSE '[]'::jsonb
  END,
  mental_health_services = CASE 
    WHEN id = 'worcester' THEN '[{"name": "Counselling Service", "phone": "+44 1905 855000", "website": "https://www.worcester.ac.uk/student-services/counselling"}]'::jsonb
    WHEN id = 'lse' THEN '[{"name": "Student Counselling Service", "phone": "+44 20 7955 7531", "website": "https://info.lse.ac.uk/current-students/student-wellbeing"}]'::jsonb
    WHEN id = 'manchester' THEN '[{"name": "Counselling Service", "phone": "+44 161 275 2864", "website": "https://www.manchester.ac.uk/study/student-life/student-support/"}]'::jsonb
    ELSE '[]'::jsonb
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE id IN ('worcester', 'lse', 'manchester');
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
    
    console.log('Executing schema fixes...');
    await client.query(fixUniversitiesSchemaSQL);
    
    console.log('Schema fixes completed successfully');
    
    res.status(200).json({
      success: true,
      message: 'Universities table schema fixed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Schema fix error:', error);
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
