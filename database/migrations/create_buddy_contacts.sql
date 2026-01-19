-- Create buddy_contacts table for Support Circle feature
CREATE TABLE IF NOT EXISTS buddy_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  relationship VARCHAR(100),
  notify_channel VARCHAR(20) DEFAULT 'sms' CHECK (notify_channel IN ('sms', 'email', 'push')),
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_buddy_contacts_user_id ON buddy_contacts(user_id);

-- Add index for active buddies
CREATE INDEX IF NOT EXISTS idx_buddy_contacts_active ON buddy_contacts(user_id, is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE TRIGGER update_buddy_contacts_updated_at BEFORE UPDATE ON buddy_contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

