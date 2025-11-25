-- Migration 006: University Domains for Auto-Assignment
-- Purpose: Allow universities to specify multiple email domains for automatic student assignment
-- Created: 2025-11-25

-- Check if domains column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'universities' AND column_name = 'domains'
  ) THEN
    ALTER TABLE universities ADD COLUMN domains TEXT[] DEFAULT '{}';
    COMMENT ON COLUMN universities.domains IS 'Array of email domains (e.g., {worcs.ac.uk, student.worcs.ac.uk}) for automatic student assignment';
  END IF;
END $$;

-- Add index for faster domain lookups
CREATE INDEX IF NOT EXISTS idx_universities_domains ON universities USING gin(domains);

-- Update existing universities with their known domains
UPDATE universities SET domains = ARRAY['worcs.ac.uk', 'worcester.ac.uk'] WHERE id = 'worcester' AND (domains IS NULL OR domains = '{}');
UPDATE universities SET domains = ARRAY['lse.ac.uk', 'student.lse.ac.uk'] WHERE id = 'lse' AND (domains IS NULL OR domains = '{}');

-- Example queries:
-- Find university by email domain:
--   SELECT id, name FROM universities WHERE 'worcs.ac.uk' = ANY(domains);
-- Get all domains across all universities:
--   SELECT id, name, unnest(domains) as domain FROM universities;


