-- Add wellbeing_support_url to universities table
ALTER TABLE universities ADD COLUMN IF NOT EXISTS wellbeing_support_url TEXT;

-- Set Worcester's wellbeing URL
UPDATE universities 
SET wellbeing_support_url = 'https://studentservices.on.worc.ac.uk/firstpoint/' 
WHERE id = 'worcester';
