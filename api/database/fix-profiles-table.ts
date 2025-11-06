// API endpoint to fix profiles table - add missing columns
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

const fixProfilesTableSQL = `
-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS university_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS baseline_established BOOLEAN DEFAULT false;

-- Update existing records with sample data
UPDATE profiles 
SET 
  email = CASE 
    WHEN id = '7c52ad65-61c5-41b3-90e5-36113ab5d14f' THEN 'test@worcester.ac.uk'
    ELSE CONCAT('user', SUBSTRING(id::text, 1, 8), '@worcester.ac.uk')
  END,
  last_name = 'User',
  university_id = 'worcester',
  streak_count = 0,
  baseline_established = false
WHERE email IS NULL;

-- Insert some sample users for testing
INSERT INTO profiles (user_id, email, first_name, last_name, display_name, university_id, streak_count, baseline_established) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@worcester.ac.uk', 'Admin', 'User', 'Worcester Admin', 'worcester', 5, true),
  ('00000000-0000-0000-0000-000000000002', 'student1@worcester.ac.uk', 'John', 'Smith', 'John Smith', 'worcester', 3, true),
  ('00000000-0000-0000-0000-000000000003', 'student2@worcester.ac.uk', 'Jane', 'Doe', 'Jane Doe', 'worcester', 7, true),
  ('00000000-0000-0000-0000-000000000004', 'student3@lse.ac.uk', 'Alice', 'Johnson', 'Alice Johnson', 'lse', 2, false),
  ('00000000-0000-0000-0000-000000000005', 'student4@lse.ac.uk', 'Bob', 'Wilson', 'Bob Wilson', 'lse', 4, true)
ON CONFLICT (email) DO NOTHING;
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();
    
    // Execute the profiles table fix
    await client.query(fixProfilesTableSQL);

    await client.end();

    return res.status(200).json({ 
      success: true, 
      message: 'Profiles table fixed successfully - added email, last_name, university_id, streak_count, baseline_established columns and sample data'
    });

  } catch (error: any) {
    console.error('Profiles table fix error:', error);
    try {
      await client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error 
    });
  }
}
