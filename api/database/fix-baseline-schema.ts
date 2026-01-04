import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const dbConfig = {
  host: process.env.AWS_RDS_HOST || process.env.DB_HOST,
  port: parseInt(process.env.AWS_RDS_PORT || process.env.DB_PORT || '5432'),
  database: process.env.AWS_RDS_DATABASE || process.env.DB_NAME || 'mindmeasure',
  user: process.env.AWS_RDS_USER || process.env.DB_USER,
  password: process.env.AWS_RDS_PASSWORD || process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

const fixBaselineSchemaSQL = `
-- Ensure assessment_sessions has all required columns for baseline assessment
ALTER TABLE assessment_sessions 
ADD COLUMN IF NOT EXISTS assessment_type TEXT,
ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_at_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS question_responses JSONB DEFAULT '{}'::jsonb;

-- Ensure fusion_outputs has all required columns
ALTER TABLE fusion_outputs 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS final_score INTEGER,
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS p_worse_fused DECIMAL,
ADD COLUMN IF NOT EXISTS analysis JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS public_state TEXT DEFAULT 'report',
ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'v1.0';

-- Ensure profiles has baseline_established column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS baseline_established BOOLEAN DEFAULT false;

-- Create session_measures table if it doesn't exist (for PHQ-2, GAD-2 data)
CREATE TABLE IF NOT EXISTS session_measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  measure TEXT NOT NULL,
  value_num NUMERIC NULL,
  value_text TEXT NULL,
  source TEXT NOT NULL DEFAULT 'elevenlabs',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, measure)
);

-- Create validated_scale_responses table if it doesn't exist
CREATE TABLE IF NOT EXISTS validated_scale_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  scale_type TEXT NOT NULL, -- 'PHQ-2', 'GAD-2'
  question_text TEXT NOT NULL,
  response_value INTEGER NOT NULL,
  response_scale TEXT NOT NULL DEFAULT '0-3',
  raw_score INTEGER,
  interpreted_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id ON assessment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_type ON assessment_sessions(assessment_type);
CREATE INDEX IF NOT EXISTS idx_fusion_outputs_user_id ON fusion_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_fusion_outputs_session_id ON fusion_outputs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_measures_session_id ON session_measures(session_id);
CREATE INDEX IF NOT EXISTS idx_validated_scale_responses_session_id ON validated_scale_responses(session_id);

-- Sample baseline data for testing (if no data exists)
INSERT INTO assessment_sessions (user_id, assessment_type, session_data, topics, status, created_at)
SELECT 
  gen_random_uuid(),
  'baseline',
  '{"conversation_completed": true, "assessment_mode": "baseline", "platform": "mobile"}'::jsonb,
  '["wellbeing", "baseline", "initial_assessment"]'::jsonb,
  'completed',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM assessment_sessions WHERE assessment_type = 'baseline');
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔧 Fixing baseline assessment database schema...');
    
    await pool.query(fixBaselineSchemaSQL);
    
    console.log('✅ Baseline schema migration completed successfully');
    
    res.status(200).json({ 
      success: true, 
      message: 'Baseline assessment database schema fixed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Baseline schema migration failed:', error);
    res.status(500).json({ 
      error: 'Database migration failed', 
      details: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await pool.end();
  }
}
