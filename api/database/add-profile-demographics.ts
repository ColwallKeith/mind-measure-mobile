// API endpoint to add demographic columns to profiles table
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
  password: process.env.AWS_AURORA_PASSWORD || process.env.AWS_RDS_PASSWORD || 'K31th50941964!',
  ssl: { rejectUnauthorized: false }
};

const addDemographicColumnsSQL = `
-- Add demographic columns to profiles table for student profile data
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20),
ADD COLUMN IF NOT EXISTS course VARCHAR(200),
ADD COLUMN IF NOT EXISTS subjects JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS school VARCHAR(200),
ADD COLUMN IF NOT EXISTS faculty VARCHAR(200),
ADD COLUMN IF NOT EXISTS living_situation VARCHAR(50),
ADD COLUMN IF NOT EXISTS hall_of_residence VARCHAR(200),
ADD COLUMN IF NOT EXISTS domicile VARCHAR(50),
ADD COLUMN IF NOT EXISTS age_range VARCHAR(20),
ADD COLUMN IF NOT EXISTS study_mode VARCHAR(20) DEFAULT 'Full-time',
ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_first_generation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_caring_responsibilities BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS baseline_established BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS university VARCHAR(200);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();
    
    // Execute the demographics columns migration
    await client.query(addDemographicColumnsSQL);

    // Verify the columns exist
    const verifyResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position;
    `);

    await client.end();

    return res.status(200).json({ 
      success: true, 
      message: 'Profile demographics columns added successfully',
      columns: verifyResult.rows.map((r: { column_name: string; data_type: string }) => 
        `${r.column_name} (${r.data_type})`
      )
    });

  } catch (error: any) {
    console.error('Profile demographics migration error:', error);
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

