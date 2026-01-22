-- Add nudges column to universities table
-- This stores the array of nudge messages for each university

-- Check if column exists, add if not
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'universities' 
    AND column_name = 'nudges'
  ) THEN
    ALTER TABLE universities 
    ADD COLUMN nudges JSONB DEFAULT '[]'::jsonb;
    
    COMMENT ON COLUMN universities.nudges IS 'Array of nudge messages (events, services, tips) for student app';
  END IF;
END $$;

-- Sample nudge structure for reference:
-- [
--   {
--     "id": "uuid",
--     "template": "event",
--     "status": "active",
--     "isPinned": true,
--     "priority": "high",
--     "isRecurring": false,
--     "expiryDate": "2026-01-31T23:59:59Z",
--     "timesShown": 0,
--     "clicks": 0,
--     "eventTitle": "Mental Health Week 2026",
--     "eventDescription": "Join us for workshops",
--     "eventLocation": "Student Union",
--     "eventDateTime": "Jan 27-31",
--     "eventButtonText": "Learn More",
--     "eventButtonLink": "https://...",
--     "createdAt": "2026-01-22T...",
--     "updatedAt": "2026-01-22T..."
--   }
-- ]
