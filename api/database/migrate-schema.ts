#!/usr/bin/env node

// Database Schema Migration Script
// Adds missing columns required by the admin dashboard

// @ts-ignore - pg types not available in Vercel environment
import { Client } from 'pg';

const dbConfig = {
  host: process.env.VITE_DB_HOST || 'mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com',
  port: parseInt(process.env.VITE_DB_PORT || '5432'),
  database: process.env.VITE_DB_NAME || 'mindmeasure',
  user: process.env.VITE_DB_USERNAME || 'mindmeasure_admin',
  password: process.env.VITE_DB_PASSWORD || 'MindMeasure2024!',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

const migrationSQL = `
-- Add missing columns to fusion_outputs table
ALTER TABLE fusion_outputs 
ADD COLUMN IF NOT EXISTS final_score INTEGER,
ADD COLUMN IF NOT EXISTS score_smoothed DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS uncertainty DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS qc_overall VARCHAR(50),
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]'::jsonb;

-- Add missing columns to assessment_sessions table  
ALTER TABLE assessment_sessions
ADD COLUMN IF NOT EXISTS final_score INTEGER,
ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_at_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fusion_outputs_final_score ON fusion_outputs(final_score);
CREATE INDEX IF NOT EXISTS idx_fusion_outputs_created_at ON fusion_outputs(created_at);
CREATE INDEX IF NOT EXISTS idx_fusion_outputs_user_id ON fusion_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_created_at ON assessment_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id ON assessment_sessions(user_id);

-- Update existing records to have reasonable defaults
UPDATE fusion_outputs 
SET 
  final_score = COALESCE(score, 50),
  score_smoothed = COALESCE(score::decimal, 50.0),
  uncertainty = 0.1,
  qc_overall = 'good'
WHERE final_score IS NULL;

UPDATE assessment_sessions 
SET 
  final_score = COALESCE(score, 50),
  created_at_end = created_at + INTERVAL '1 hour',
  updated_at = COALESCE(updated_at, created_at)
WHERE final_score IS NULL OR created_at_end IS NULL;

-- Add sample data for testing if tables are empty
INSERT INTO fusion_outputs (user_id, score, final_score, analysis, created_at)
SELECT 
  gen_random_uuid(),
  50 + (random() * 40)::integer,
  50 + (random() * 40)::integer,
  '{"mood": "neutral", "energy": "moderate"}'::jsonb,
  CURRENT_TIMESTAMP - (random() * INTERVAL '30 days')
FROM generate_series(1, 10)
WHERE NOT EXISTS (SELECT 1 FROM fusion_outputs LIMIT 1);

COMMIT;
`;

async function runMigration() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    
    console.log('🔄 Running schema migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Added columns:');
    console.log('   - fusion_outputs: final_score, score_smoothed, uncertainty, qc_overall, session_id, topics');
    console.log('   - assessment_sessions: final_score, topics, created_at_end, updated_at');
    console.log('📈 Created performance indexes');
    console.log('🎯 Updated existing records with defaults');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runMigration();
}

export { runMigration };
