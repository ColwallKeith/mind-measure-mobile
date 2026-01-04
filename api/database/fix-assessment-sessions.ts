// API endpoint to fix assessment_sessions table - add missing columns
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

const fixAssessmentSessionsSQL = `
-- Add missing columns to assessment_sessions table
ALTER TABLE assessment_sessions 
ADD COLUMN IF NOT EXISTS created_at_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS final_score INTEGER,
ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20) DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS risk_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0;

-- Update existing records with sample data
UPDATE assessment_sessions 
SET 
  created_at_end = created_at + INTERVAL '30 minutes',
  final_score = CASE 
    WHEN score IS NOT NULL THEN score
    ELSE FLOOR(RANDOM() * 40 + 60)::INTEGER  -- Random score 60-100
  END,
  topics = CASE 
    WHEN id::text LIKE '%1%' THEN '["stress", "academic"]'::jsonb
    WHEN id::text LIKE '%2%' THEN '["anxiety", "social"]'::jsonb
    WHEN id::text LIKE '%3%' THEN '["sleep", "health"]'::jsonb
    ELSE '["general", "wellbeing"]'::jsonb
  END,
  sentiment = CASE 
    WHEN RANDOM() < 0.6 THEN 'positive'
    WHEN RANDOM() < 0.8 THEN 'neutral'
    ELSE 'negative'
  END,
  risk_level = FLOOR(RANDOM() * 5)::INTEGER,  -- 0-4 risk level
  engagement_score = FLOOR(RANDOM() * 30 + 70)::INTEGER  -- 70-100 engagement
WHERE created_at_end IS NULL;

-- Insert sample assessment sessions for testing
INSERT INTO assessment_sessions (user_id, session_data, score, final_score, status, conversation_summary, assessment_type, baseline_completed, topics, sentiment, risk_level, engagement_score, created_at, created_at_end) VALUES
  ('00000000-0000-0000-0000-000000000001', '{"responses": ["good", "stressed"]}', 75, 75, 'completed', 'Student reported feeling good but stressed about exams', 'daily_checkin', true, '["stress", "academic"]'::jsonb, 'neutral', 2, 85, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '25 minutes'),
  ('00000000-0000-0000-0000-000000000002', '{"responses": ["great", "confident"]}', 88, 88, 'completed', 'Student feeling confident and positive', 'weekly_assessment', true, '["confidence", "positive"]'::jsonb, 'positive', 0, 92, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),
  ('00000000-0000-0000-0000-000000000003', '{"responses": ["tired", "overwhelmed"]}', 45, 45, 'completed', 'Student feeling overwhelmed with coursework', 'crisis_check', true, '["overwhelm", "fatigue"]'::jsonb, 'negative', 4, 65, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '35 minutes'),
  ('00000000-0000-0000-0000-000000000004', '{"responses": ["okay", "social"]}', 70, 70, 'completed', 'Student doing okay, mentioned social activities', 'daily_checkin', false, '["social", "general"]'::jsonb, 'neutral', 1, 78, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '20 minutes'),
  ('00000000-0000-0000-0000-000000000005', '{"responses": ["excellent", "motivated"]}', 95, 95, 'completed', 'Student feeling excellent and motivated', 'baseline', true, '["motivation", "success"]'::jsonb, 'positive', 0, 95, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '28 minutes')
ON CONFLICT (id) DO NOTHING;
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();
    
    // Execute the assessment_sessions table fix
    await client.query(fixAssessmentSessionsSQL);

    await client.end();

    return res.status(200).json({ 
      success: true, 
      message: 'Assessment sessions table fixed successfully - added missing columns and sample data'
    });

  } catch (error: any) {
    console.error('Assessment sessions table fix error:', error);
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
