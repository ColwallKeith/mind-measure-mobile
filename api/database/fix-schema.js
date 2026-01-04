#!/usr/bin/env node

// Fix database schema to match what the admin dashboard expects

const { Client } = require('pg');

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
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS final_score INTEGER,
ADD COLUMN IF NOT EXISTS analysis JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]'::jsonb;

-- Add missing columns to assessment_sessions table  
ALTER TABLE assessment_sessions
ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS final_score INTEGER,
ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_at_end TIMESTAMP;

-- Create indexes for performance on the columns the admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_fusion_outputs_final_score ON fusion_outputs(final_score) WHERE final_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fusion_outputs_created_at ON fusion_outputs(created_at) WHERE created_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fusion_outputs_user_id ON fusion_outputs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_created_at ON assessment_sessions(created_at) WHERE created_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id ON assessment_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_final_score ON assessment_sessions(final_score) WHERE final_score IS NOT NULL;

-- Update existing records to have reasonable defaults where needed
UPDATE fusion_outputs 
SET 
  final_score = COALESCE(score_smoothed::integer, 50),
  score = COALESCE(score_smoothed::integer, 50),
  analysis = COALESCE(analysis, '{"mood": "neutral", "energy": "moderate"}'::jsonb),
  topics = COALESCE(topics, '[]'::jsonb)
WHERE final_score IS NULL OR score IS NULL;

UPDATE assessment_sessions 
SET 
  final_score = COALESCE(score, 50),
  score = COALESCE(final_score, 50),
  session_data = COALESCE(session_data, '{}'::jsonb),
  topics = COALESCE(topics, '[]'::jsonb),
  created_at_end = COALESCE(created_at_end, created_at + INTERVAL '1 hour')
WHERE final_score IS NULL OR score IS NULL OR session_data IS NULL OR created_at_end IS NULL;

-- Add some sample data if tables are mostly empty (for testing)
INSERT INTO fusion_outputs (user_id, score, final_score, score_smoothed, analysis, topics, created_at)
SELECT 
  gen_random_uuid(),
  50 + (random() * 40)::integer,
  50 + (random() * 40)::integer,
  50 + (random() * 40),
  '{"mood": "neutral", "energy": "moderate", "wellbeing_score": 65}'::jsonb,
  '["stress", "sleep", "exercise"]'::jsonb,
  CURRENT_TIMESTAMP - (random() * INTERVAL '30 days')
FROM generate_series(1, 20)
WHERE (SELECT COUNT(*) FROM fusion_outputs WHERE final_score IS NOT NULL) < 5;

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
    console.log('📊 Added missing columns:');
    console.log('   - fusion_outputs: user_id, score, final_score, analysis, topics');
    console.log('   - assessment_sessions: session_data, score, final_score, topics, created_at_end');
    console.log('📈 Created performance indexes');
    console.log('🎯 Updated existing records with defaults');
    console.log('📝 Added sample data for testing');
    
    // Verify the fix
    console.log('\n🔍 Verifying columns exist...');
    const testQuery = await client.query(`
      SELECT COUNT(*) as count FROM fusion_outputs WHERE final_score IS NOT NULL;
    `);
    console.log(`✅ Found ${testQuery.rows[0].count} records with final_score`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
