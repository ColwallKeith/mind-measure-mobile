-- Assign ALL registered users to University of Worcester
-- Worcester is the only active client; LSE and others are dummy data

-- First, check current distribution
SELECT 
  university_id,
  COUNT(*) as user_count
FROM profiles
GROUP BY university_id
ORDER BY user_count DESC;

-- Update ALL users to Worcester
UPDATE profiles 
SET 
  university_id = 'worcester',
  updated_at = NOW()
WHERE university_id IS NOT NULL 
  OR university_id IS NULL;

-- Verify the change
SELECT 
  university_id,
  COUNT(*) as user_count,
  MIN(created_at) as first_user,
  MAX(created_at) as last_user
FROM profiles
GROUP BY university_id;

-- Show sample of updated users
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  university_id,
  created_at,
  updated_at
FROM profiles
ORDER BY updated_at DESC
LIMIT 20;
