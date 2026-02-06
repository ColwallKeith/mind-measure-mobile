-- Buddy V1: invite + consent flow. Email-only, no SMS, no escalation.
-- Max 5 total per user (active buddies + pending invites).

-- Invite status: pending | accepted | declined | expired | revoked
CREATE TABLE IF NOT EXISTS buddy_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  invitee_name VARCHAR(255) NOT NULL,
  contact_type VARCHAR(20) NOT NULL DEFAULT 'email',
  contact_value VARCHAR(255) NOT NULL,
  contact_value_masked VARCHAR(255),
  personal_message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  token_hash VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  resend_count INT NOT NULL DEFAULT 0,
  last_resend_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buddy_invites_user_id ON buddy_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_buddy_invites_status ON buddy_invites(user_id, status);
CREATE INDEX IF NOT EXISTS idx_buddy_invites_token_hash ON buddy_invites(token_hash);

-- Buddy status: active | removed. Created when invite is accepted.
CREATE TABLE IF NOT EXISTS buddies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  invite_id UUID NOT NULL REFERENCES buddy_invites(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'removed')),
  preference_order INT NOT NULL DEFAULT 0,
  opt_out_token_hash VARCHAR(255),
  last_nudged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buddies_user_id ON buddies(user_id);
CREATE INDEX IF NOT EXISTS idx_buddies_status ON buddies(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_buddies_opt_out_token_hash ON buddies(opt_out_token_hash);

-- Optional: trigger for updated_at if update_updated_at_column exists
-- CREATE TRIGGER update_buddy_invites_updated_at BEFORE UPDATE ON buddy_invites
-- FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_buddies_updated_at BEFORE UPDATE ON buddies
-- FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
