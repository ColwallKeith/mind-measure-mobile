-- Add buddy verification system
-- This migration adds verification tokens, status tracking, and audit trails

-- Add verification fields to buddy_contacts
ALTER TABLE buddy_contacts
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64) UNIQUE,
ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS decline_reason TEXT,
ADD COLUMN IF NOT EXISTS last_verification_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

-- Create buddy_verification_audit table for tracking all verification events
CREATE TABLE IF NOT EXISTS buddy_verification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_contact_id UUID NOT NULL REFERENCES buddy_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'verification_sent',
    'verification_resent', 
    'verification_accepted',
    'verification_declined',
    'verification_expired',
    'verification_revoked'
  )),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create buddy_check_in_requests table for tracking check-in requests
-- (Preparing for both user-initiated and system-initiated requests)
CREATE TABLE IF NOT EXISTS buddy_check_in_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_contact_id UUID NOT NULL REFERENCES buddy_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('user_initiated', 'system_initiated')),
  trigger_reason TEXT, -- For system-initiated: "low_score_3_days", "high_risk_detected", etc.
  message_template VARCHAR(50), -- Template used for the message
  
  -- Delivery tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status VARCHAR(20) CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
  delivery_error TEXT,
  
  -- Engagement tracking
  link_clicked_at TIMESTAMP WITH TIME ZONE,
  link_clicked_ip INET,
  response_received_at TIMESTAMP WITH TIME ZONE,
  response_type VARCHAR(20) CHECK (response_type IN ('acknowledged', 'called', 'messaged', 'unavailable')),
  response_notes TEXT,
  
  -- Rate limiting
  is_rate_limited BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_buddy_verification_audit_buddy_id ON buddy_verification_audit(buddy_contact_id);
CREATE INDEX IF NOT EXISTS idx_buddy_verification_audit_user_id ON buddy_verification_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_buddy_verification_audit_event_type ON buddy_verification_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_buddy_verification_audit_created_at ON buddy_verification_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buddy_check_in_requests_buddy_id ON buddy_check_in_requests(buddy_contact_id);
CREATE INDEX IF NOT EXISTS idx_buddy_check_in_requests_user_id ON buddy_check_in_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_buddy_check_in_requests_request_type ON buddy_check_in_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_buddy_check_in_requests_sent_at ON buddy_check_in_requests(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_buddy_check_in_requests_delivery_status ON buddy_check_in_requests(delivery_status);

-- Add updated_at trigger for buddy_check_in_requests
CREATE TRIGGER update_buddy_check_in_requests_updated_at BEFORE UPDATE ON buddy_check_in_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if buddy can receive check-in requests
CREATE OR REPLACE FUNCTION can_buddy_receive_checkins(buddy_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  buddy_verified BOOLEAN;
  buddy_active BOOLEAN;
BEGIN
  SELECT verified, is_active INTO buddy_verified, buddy_active
  FROM buddy_contacts
  WHERE id = buddy_id;
  
  RETURN buddy_verified AND buddy_active;
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limiting for check-in requests
-- Prevents spam: max 1 request per buddy per 24 hours
CREATE OR REPLACE FUNCTION is_checkin_request_rate_limited(buddy_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_request_time TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT sent_at INTO last_request_time
  FROM buddy_check_in_requests
  WHERE buddy_contact_id = buddy_id
    AND delivery_status IN ('sent', 'delivered')
  ORDER BY sent_at DESC
  LIMIT 1;
  
  -- If no previous request, not rate limited
  IF last_request_time IS NULL THEN
    RETURN false;
  END IF;
  
  -- Rate limited if last request was within 24 hours
  RETURN (NOW() - last_request_time) < INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

