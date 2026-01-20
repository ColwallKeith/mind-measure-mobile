-- Fix university_id for users incorrectly assigned to LSE
-- LSE is dummy data with no real users

-- Update all LSE users to Worcester
UPDATE profiles 
SET 
  university_id = 'worcester',
  updated_at = NOW()
WHERE university_id = 'lse';

-- Verify the change
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  university_id,
  updated_at
FROM profiles
WHERE email LIKE '%@mindmeasure.co.uk%'
ORDER BY updated_at DESC
LIMIT 10;
