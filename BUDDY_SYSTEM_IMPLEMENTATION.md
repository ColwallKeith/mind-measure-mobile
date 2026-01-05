# Buddy Verification & Check-in Request System
**Implementation Plan for Mind Measure Support Circle**

---

## Overview

This system enables users to nominate support buddies with proper consent verification before any communication. It handles two pathways:
1. **User-initiated check-in requests** - Student asks for support
2. **System-initiated alerts** - Mind Measure detects concerning patterns

---

## Phase 1: Buddy Verification System ✅ READY TO IMPLEMENT

### Database Schema

#### Tables Created:
1. **`buddy_contacts`** (Enhanced)
   - Added verification fields: `verification_token`, `verification_token_expires_at`, `verified`, `verified_at`, `declined_at`
   - Tracks verification attempts and timestamps

2. **`buddy_verification_audit`**
   - Logs all verification events (sent, accepted, declined, expired)
   - Tracks IP addresses and user agents for security
   - Full audit trail for GDPR compliance

3. **`buddy_check_in_requests`**
   - Tracks all check-in requests (user-initiated and system-initiated)
   - Delivery status tracking (pending → sent → delivered)
   - Engagement tracking (link clicked, response received)
   - Rate limiting (max 1 request per buddy per 24 hours)

#### Helper Functions:
- `can_buddy_receive_checkins(buddy_id)` - Checks if buddy is verified and active
- `is_checkin_request_rate_limited(buddy_id)` - Prevents spam

### API Endpoints Created:

#### 1. **POST `/api/buddy/send-verification`**
**Purpose:** Send verification email when user adds a buddy

**Request:**
```json
{
  "buddyContactId": "uuid",
  "userId": "uuid"
}
```

**Process:**
1. Validates buddy contact exists and belongs to user
2. Checks rate limiting (max 1 email per hour)
3. Generates secure 64-character token (7-day expiry)
4. Sends email with Accept/Decline links
5. Logs event in audit table

**Email Content:** HTML template with placeholders for:
- What being a support buddy means
- Privacy & data handling (GDPR compliance)
- Accept/Decline buttons

#### 2. **GET `/api/buddy/verify?token=xxx&action=accept|decline`**
**Purpose:** Handle buddy's response to verification email

**Responses:**
- **Accept** → Sets `verified: true`, logs acceptance, renders success page
- **Decline** → Sets `is_active: false`, logs declination, renders response page
- **Expired** → Returns 410, prompts user to request new link
- **Already Verified** → Returns success page

---

## SMS Delivery & Read Receipt Strategy

### The Challenge:
Standard SMS **does not support read receipts**. We can track:
- ✅ Delivery confirmation (AWS SNS confirms message reached phone)
- ✅ Link engagement (trackable URL to confirm buddy saw message)
- ❌ True "read" status (not possible with SMS)

### Proposed Solution:

#### For User-Initiated Check-in Requests:
```
"Hi [Buddy Name], [Student Name] has asked if you could check in on them. 
They might need some support right now.

Tap here to confirm: https://mobile.mindmeasure.app/buddy/checkin/[token]

Reply STOP to opt out."
```

**Tracking:**
1. **Delivery Status** - AWS SNS confirms SMS delivered
2. **Link Click** - Logs timestamp, IP address when buddy clicks
3. **Response** - Buddy confirms via tracking link (options: "Called", "Messaged", "Unavailable")

#### For System-Initiated Alerts:
```
"Hi [Buddy Name], Mind Measure has detected concerning wellbeing patterns for [Student Name] 
over the past [X] days. They may need support.

Tap here for details: https://mobile.mindmeasure.app/buddy/alert/[token]

This is an automated safety alert. Reply STOP to opt out."
```

---

## Workflow Diagrams

### User Adds Buddy:
```
1. User enters buddy details (name, phone, email, relationship)
   ↓
2. System saves to buddy_contacts (verified: false)
   ↓
3. Frontend calls /api/buddy/send-verification
   ↓
4. System generates token, sends verification email
   ↓
5. Buddy receives email with Accept/Decline buttons
   ↓
6. Buddy clicks Accept → verified: true, can now receive SMS
   OR
   Buddy clicks Decline → is_active: false, won't receive SMS
```

### User-Initiated Check-in Request:
```
1. User taps "Ask for Check-in" on buddy card
   ↓
2. System checks: is_verified AND !is_rate_limited
   ↓
3. System sends SMS via AWS SNS with tracking link
   ↓
4. System logs request to buddy_check_in_requests (status: pending)
   ↓
5. AWS SNS confirms delivery → update status: delivered
   ↓
6. Buddy clicks tracking link → logs timestamp, updates link_clicked_at
   ↓
7. Buddy selects response (Called/Messaged/Unavailable)
   ↓
8. System logs response, notifies user
```

### System-Initiated Alert:
```
1. Analysis pipeline detects concerning pattern (e.g., 3 consecutive low scores)
   ↓
2. System checks user's verified buddies
   ↓
3. System sends SMS to top 2 buddies (by rank)
   ↓
4. Logs as system_initiated request with trigger_reason
   ↓
5. Tracks delivery and engagement same as user-initiated
```

---

## Privacy & GDPR Compliance

### Data Collected:
- **Buddy Personal Data:** Name, phone, email, relationship
- **Verification Events:** Timestamps, IP addresses, user agents
- **Check-in Requests:** SMS delivery status, link clicks, responses

### Consent Mechanisms:
1. **Explicit Consent:** Buddy must click "Accept" in verification email
2. **Opt-out:** Every SMS includes "Reply STOP to opt out"
3. **Token Expiry:** Verification links expire after 7 days
4. **Audit Trail:** All events logged for compliance

### User Rights:
- **Right to Access:** Buddies can request their data
- **Right to Erasure:** Buddies can request deletion
- **Right to Withdraw:** Buddies can opt-out anytime

---

## Rate Limiting & Safety

### Verification Emails:
- Max 1 email per hour per buddy
- Max 3 total attempts per buddy

### Check-in Requests:
- Max 1 request per buddy per 24 hours
- Prevents spam and maintains trust

### System Alerts:
- Max 1 alert per 72 hours per user
- Escalation protocol if no response

---

## Implementation Status

### ✅ Completed:
1. Database migrations (verification + check-in tracking)
2. API endpoint: `/api/buddy/send-verification`
3. API endpoint: `/api/buddy/verify`
4. HTML email templates with placeholders
5. Verification response pages (success, error, expired)
6. Audit logging for GDPR compliance

### 🟡 Next Steps (Phase 2):
1. **Frontend Integration:**
   - Add "Send Verification" button to SupportCircle after adding buddy
   - Show verification status on buddy cards (Pending/Verified/Declined)
   - Add "Resend Verification" option

2. **Email Service Integration:**
   - Integrate AWS SES for sending verification emails
   - Add email templates to Vercel environment variables
   - Test email delivery

3. **SMS Service Setup:**
   - Integrate AWS SNS for SMS delivery
   - Create SMS templates for both pathways
   - Test SMS delivery and tracking

4. **Check-in Request Implementation:**
   - API endpoint: `/api/buddy/send-checkin` (user-initiated)
   - API endpoint: `/api/buddy/checkin/[token]` (tracking page)
   - Update `handleAskCheckIn` in SupportCircle.tsx

5. **System Alert Implementation:**
   - Analysis pipeline integration
   - Automated alert triggers
   - Escalation protocols

### 🔴 User Action Required:
1. **Email Content:** Replace placeholders in verification email template:
   - What being a support buddy means
   - Expectations and frequency of contact
   - Privacy policy and data handling details

2. **SMS Templates:** Provide final wording for:
   - User-initiated check-in requests
   - System-initiated alerts
   - Opt-out messages

3. **Legal Review:** Verify compliance with:
   - UK GDPR
   - UK data protection laws
   - ICO guidelines for sensitive data

---

## Testing Checklist

### Verification Flow:
- [ ] User adds buddy with email
- [ ] Verification email sent and received
- [ ] Token generates correctly
- [ ] Accept link marks buddy as verified
- [ ] Decline link deactivates buddy
- [ ] Expired link shows appropriate message
- [ ] Rate limiting prevents spam
- [ ] Audit logs capture all events

### Check-in Request Flow:
- [ ] Only verified buddies can receive requests
- [ ] Rate limiting works (24-hour window)
- [ ] SMS delivered successfully
- [ ] Tracking link logs engagement
- [ ] Response options work correctly
- [ ] User receives notification of buddy's response

### GDPR Compliance:
- [ ] Buddy consent explicitly captured
- [ ] Opt-out mechanism works
- [ ] Data retention policies enforced
- [ ] Audit trail complete and queryable
- [ ] Privacy policy linked in all communications

---

## Deployment Steps

1. **Run Database Migration:**
   ```bash
   PGPASSWORD="K31th50941964!" psql \
     -h mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com \
     -U mindmeasure_admin \
     -d mindmeasure \
     -f database/migrations/add_buddy_verification_system.sql
   ```

2. **Deploy API Endpoints:**
   ```bash
   npm run build
   npx vercel --prod
   ```

3. **Configure Environment Variables in Vercel:**
   - `AWS_SES_REGION=eu-west-2`
   - `AWS_SNS_REGION=eu-west-2`
   - `NEXT_PUBLIC_BASE_URL=https://mobile.mindmeasure.app`

4. **Test Verification Flow:**
   - Add a test buddy with your own email
   - Verify email arrives
   - Test Accept/Decline links
   - Check database updates

---

## Questions for User

1. **Email Content:** What specific information should we include about:
   - Support buddy responsibilities?
   - Expected frequency of check-ins?
   - What to do when receiving an alert?

2. **SMS Wording:** What tone should we use? (Casual vs. formal)

3. **System Alerts:** What should trigger an automated alert?
   - 3 consecutive low scores?
   - Score drops >20 points in 1 week?
   - Risk assessment flags "high" level?

4. **Response Options:** When buddy receives check-in request, what actions should they be able to take?
   - "I've called them"
   - "I've messaged them"
   - "I can't reach them right now"
   - "I'm unavailable"

5. **Escalation:** If all buddies are unresponsive during a system alert, what should happen?
   - Contact university wellbeing services?
   - Send email to student's registered contact?
   - Emergency services threshold?

---

**Status:** Phase 1 implementation complete. Awaiting user input on content and triggers before proceeding to Phase 2.

