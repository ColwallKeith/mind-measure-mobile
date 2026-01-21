-- Add hall_of_residence column to profiles table
-- This allows tracking which specific hall/accommodation each student lives in

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS hall_of_residence TEXT;

-- Add index for better performance on hall-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_hall_of_residence 
ON profiles(hall_of_residence) 
WHERE hall_of_residence IS NOT NULL;

-- Update comment
COMMENT ON COLUMN profiles.hall_of_residence IS 'Specific hall of residence name (e.g., "Woodbury Hall", "Castle Street Apartments"). Null if off-campus or at home.';

-- Note: residence field remains for broad categories: "On Campus", "Off Campus", "At Home"
-- hall_of_residence is for specific building identification within "On Campus"
