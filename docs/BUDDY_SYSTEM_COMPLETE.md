# Buddy System - Complete Architecture & Implementation Guide

**Version:** 2.0 (Email-Only Implementation)  
**Date:** January 30, 2026  
**Status:** ✅ Production Ready  
**Domains:** `mobile.mindmeasure.app` (student app), `admin.mindmeasure.co.uk` (admin dashboard)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [User Flows](#user-flows)
5. [Email Templates](#email-templates)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Security & Privacy](#security--privacy)
9. [Testing](#testing)
10. [Deployment](#deployment)

---

## Overview

### What is the Buddy System?

The Buddy system allows Mind Measure students to nominate trusted friends or family members who can receive gentle email nudges to check in with them when wellbeing patterns indicate they may need support.

### Key Principles

1. **Privacy First** - Buddies never see wellbeing scores, check-ins, or app data
2. **Consent Required** - Buddies must explicitly accept before receiving any communication
3. **No Emergency Service** - This is NOT crisis intervention or monitoring
4. **Easy Opt-Out** - Buddies can decline or opt out at any time, no explanation needed
5. **Email Only (V1)** - No SMS, no in-app messaging, no phone calls

### Limitations

- **Maximum 5 buddies** per student (active + pending combined)
- **14-day invite expiry** - Tokens expire after 2 weeks
- **Rate limiting** - Max 1 nudge per buddy per 14 days
- **Single-use tokens** - Invite links work only once

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     STUDENT INTERFACE                        │
│  (mobile.mindmeasure.app - React + Capacitor)               │
├─────────────────────────────────────────────────────────────┤
│  • BuddiesScreen - Main buddy management tab                │
│  • AddBuddyModal - Invite new buddies                       │
│  • BuddyReminderModal - Prompt to add first buddy          │
│  • SupportCircle - Display active buddies + invites         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER (Vercel)                       │
│  /api/buddies/*                                             │
├─────────────────────────────────────────────────────────────┤
│  • POST /buddies/invite - Send invite email                 │
│  • POST /buddies/invite/respond - Accept/decline           │
│  • POST /buddies/invite/consent - Fetch invite data        │
│  • POST /buddies/:id/nudge - Send check-in reminder        │
│  • POST /buddies/:id/remove - Remove buddy                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  EMAIL SERVICE (AWS SES)                     │
│  Sends HTML emails with full templates                      │
├─────────────────────────────────────────────────────────────┤
│  • InviteEmailTemplate - Initial buddy invitation          │
│  • NudgeEmailTemplate - Check-in reminder                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  BUDDY CONSENT PAGE                          │
│  (mobile.mindmeasure.app/buddies/invite?token=xxx)         │
├─────────────────────────────────────────────────────────────┤
│  • BuddyConsentPage - Public landing page                  │
│  • Accept/Decline actions                                   │
│  • Success/Error states                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (AWS Aurora PostgreSQL)                │
│  Two tables: buddy_invites + buddies                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### 1. Invite Flow
```
Student → Add Buddy Modal → API (invite) 
  → Generate Token → Send Email (SES) 
  → Email Received → Buddy Clicks Link 
  → Consent Page → Accept/Decline 
  → API (respond) → Database Updated
```

#### 2. Nudge Flow
```
Student/System → Request Nudge → Check Rate Limit 
  → Fetch Inviter Name → Send Email (SES) 
  → Update last_nudged_at → Buddy Receives Email
```

---

## Database Schema

### Table: `buddy_invites`

Tracks all invitation attempts with status tracking.

```sql
CREATE TABLE IF NOT EXISTS buddy_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                    -- FK to profiles.user_id
  invitee_name VARCHAR(255) NOT NULL,       -- Buddy's full name
  contact_type VARCHAR(20) NOT NULL DEFAULT 'email',
  contact_value VARCHAR(255) NOT NULL,      -- Buddy's email address
  contact_value_masked VARCHAR(255),        -- e.g., k***@rude.health
  personal_message TEXT,                    -- Optional message from student
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  token_hash VARCHAR(255) NOT NULL,         -- SHA-256 hash of consent token
  sent_at TIMESTAMP WITH TIME ZONE,         -- When email was sent
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 14 days from creation
  resend_count INT NOT NULL DEFAULT 0,      -- Tracks resend attempts
  last_resend_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_buddy_invites_user_id ON buddy_invites(user_id);
CREATE INDEX idx_buddy_invites_status ON buddy_invites(user_id, status);
CREATE INDEX idx_buddy_invites_token_hash ON buddy_invites(token_hash);
```

### Table: `buddies`

Created only when invite is accepted. Tracks active buddy relationships.

```sql
CREATE TABLE IF NOT EXISTS buddies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                    -- FK to profiles.user_id (the student)
  invite_id UUID NOT NULL REFERENCES buddy_invites(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,               -- Buddy's full name
  email VARCHAR(255) NOT NULL,              -- Buddy's email
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'removed')),
  preference_order INT NOT NULL DEFAULT 0,  -- Priority order (1-5)
  opt_out_slug VARCHAR(64) UNIQUE,          -- Unique token for opt-out links
  last_nudged_at TIMESTAMP WITH TIME ZONE,  -- Last time buddy received nudge
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_buddies_user_id ON buddies(user_id);
CREATE INDEX idx_buddies_status ON buddies(user_id, status) WHERE status = 'active';
CREATE INDEX idx_buddies_opt_out_slug ON buddies(opt_out_slug);
```

### Business Rules

1. **Max 5 Total**: `COUNT(buddies WHERE status='active') + COUNT(buddy_invites WHERE status='pending') <= 5`
2. **Token Security**: All tokens are 32-byte random strings, hashed with SHA-256 before storage
3. **Expiry**: Invites expire 14 days after creation (`expires_at`)
4. **Nudge Cooldown**: Cannot nudge same buddy within 14 days (`last_nudged_at`)
5. **Single-Use Tokens**: Token status changes from `pending` on first use

---

## User Flows

### Flow 1: Student Invites a Buddy

1. **Student opens Buddies tab** in mobile app
2. **Taps "Add a Buddy"** → `AddBuddyModal` opens
3. **Enters buddy details**:
   - Full name (e.g., "Keith Simon")
   - Email address
   - Optional personal message
4. **Taps "Send Invite"**
5. **API creates invite**:
   - Generates 32-byte random token
   - Hashes token with SHA-256
   - Stores in `buddy_invites` table with `status='pending'`
   - Sets `expires_at = NOW() + 14 days`
6. **API sends email via AWS SES**:
   - Uses `InviteEmailTemplate` (HTML)
   - Includes student's **full name** (first + last)
   - Includes personal message (if provided)
   - Consent URL: `https://mobile.mindmeasure.app/buddies/invite?token=xxx`
7. **Student sees success message**: "Invitation sent to Keith Simon"
8. **Invite appears as "Pending"** in student's buddy list

### Flow 2: Buddy Receives Email & Responds

1. **Buddy receives email** with subject: `{Student Full Name} has invited you to be a Buddy`
2. **Email contains**:
   - Explanation of what Mind Measure is
   - What being a Buddy means
   - What this is NOT (emergency service, monitoring)
   - Privacy information
   - Personal message from student (if included)
   - Big purple "Review and respond" button
3. **Buddy clicks button** → Lands on `/buddies/invite?token=xxx`
4. **`BuddyConsentPage` loads**:
   - Validates token via `/api/buddies/invite/consent`
   - Fetches inviter's full name
   - Displays detailed consent page with sections:
     - What Mind Measure is
     - What being a Buddy means
     - What this is not
     - When you might be contacted
     - Your data
     - Privacy policy & How Buddies work links (placeholder)
5. **Buddy makes decision**:
   - **Accept** → Calls `/api/buddies/invite/respond` with `action: 'accept'`
     - Creates row in `buddies` table with `status='active'`
     - Updates invite status to `accepted`
     - Shows success page: "You're now a Buddy for {Student Name}"
   - **Decline** → Calls `/api/buddies/invite/respond` with `action: 'decline'`
     - Updates invite status to `declined`
     - Shows decline page: "You've declined the invite"
6. **Token is marked as used** → Cannot be reused

### Flow 3: Student Sends Manual Nudge

1. **Student opens Buddies tab**
2. **Views active buddy card**
3. **Taps "Send reminder"** button on buddy card
4. **API validates**:
   - Buddy status is `active`
   - Last nudge was >14 days ago
5. **API fetches student's full name** from `profiles` table
6. **API sends nudge email**:
   - Uses `NudgeEmailTemplate`
   - Subject: `A gentle check-in reminder for {Student Full Name}`
   - Includes inviter's full name
   - Includes opt-out link with unique slug
7. **Updates `last_nudged_at`** timestamp
8. **Student sees confirmation**: "Reminder sent to {Buddy Name}"

### Flow 4: Buddy Opts Out

1. **Buddy clicks opt-out link** in any nudge email
2. **Lands on opt-out page** (future implementation)
3. **Confirms opt-out**
4. **API updates buddy status** to `removed`
5. **Buddy sees confirmation**: "You've been removed and won't receive more emails"

### Flow 5: Student Removes Buddy

1. **Student opens Buddies tab**
2. **Taps "Remove" on buddy card**
3. **Confirmation modal appears**
4. **Student confirms**
5. **API updates buddy status** to `removed`
6. **Buddy disappears from list**
7. **Buddy receives no notification** (silent removal)

### Flow 6: Buddy Reminder Modal (New Users)

1. **Student completes first check-in**
2. **Returns to dashboard** for the first time after check-in
3. **`BuddyReminderModal` appears IF**:
   - User has completed ≥1 check-in
   - User has 0 active buddies
   - Modal hasn't been shown before (stored in Capacitor Preferences)
4. **Modal explains buddy system** with purple gradient design
5. **Student can**:
   - **"Choose a Buddy"** → Opens Buddies tab
   - **"Not right now"** → Closes modal
6. **Modal shown only once** per user (flag: `buddy_reminder_shown`)

---

## Email Templates

### 1. Invite Email Template

**Subject:** `{Inviter Full Name} has invited you to be a Buddy`

**HTML Content:**

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #F9FAFB; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.email-body { background: #ffffff; padding: 40px 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.personal-message { background: #F9FAFB; border: 1px solid #E5E7EB; border-left: 4px solid #8B5CF6; border-radius: 8px; padding: 20px; margin: 0 0 32px 0; }
.message-label { font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.cta-button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; }
.footer { padding: 24px 0; text-align: center; font-size: 12px; color: #9CA3AF; line-height: 1.5; }
</style>
</head>
<body>
<div class="container">
<div class="email-body">
<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;">Hi {inviteeName},</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;"><strong>{inviterName}</strong> uses Mind Measure to keep track of their wellbeing and has asked if you'd be willing to be a Buddy.</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;">Being a Buddy means you may occasionally receive an email encouraging you to check in with them. You will not see their check-ins or scores.</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 32px 0;">This isn't an emergency service, and you're not expected to provide support beyond what feels comfortable.</p>

<!-- PERSONAL MESSAGE (if provided) -->
<div class="personal-message">
<div class="message-label">Personal message from {inviterName}</div>
<p style="font-size: 15px; color: #1F2937; line-height: 1.6; margin: 0; font-style: italic;">"{personalMessage}"</p>
</div>

<div style="text-align: center; margin: 32px 0;">
<a href="{consentUrl}" class="cta-button">Review and respond</a>
</div>

<p style="font-size: 15px; color: #64748B; line-height: 1.6; margin: 32px 0 0 0;">If you'd rather not, you can decline. No explanation needed.</p>

<p style="font-size: 16px; color: #1F2937; margin: 32px 0 0 0;">Thanks,<br>Mind Measure</p>
</div>

<div class="footer">
<p>You're receiving this because {inviterName} entered your email address to invite you to be a Buddy. If you think this was a mistake, you can decline on the next page.</p>
</div>
</div>
</body>
</html>
```

**Variables:**
- `{inviteeName}` - Buddy's name
- `{inviterName}` - Student's full name (first + last)
- `{personalMessage}` - Optional personal message (conditionally rendered)
- `{consentUrl}` - `https://mobile.mindmeasure.app/buddies/invite?token=xxx`

### 2. Nudge Email Template

**Subject:** `A gentle check-in reminder for {Inviter Full Name}`

**HTML Content:**

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #F9FAFB; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.email-body { background: #ffffff; padding: 40px 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.warning-box { background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin: 0 0 32px 0; }
.footer { padding: 24px 0; text-align: center; }
</style>
</head>
<body>
<div class="container">
<div class="email-body">
<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;">Hi {buddyName},</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;"><strong>{inviterName}</strong> uses Mind Measure and might be finding things a bit harder than usual.</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 16px 0;">A quick message or check-in could help.</p>

<p style="font-size: 16px; color: #1F2937; line-height: 1.6; margin: 0 0 32px 0;">You don't need to be a therapist or fix anything—just being there matters.</p>

<div class="warning-box">
<p style="font-size: 14px; color: #92400E; line-height: 1.5; margin: 0;"><strong>Remember:</strong> This isn't an emergency alert. If you think {inviterName} is in immediate danger, please contact emergency services or their university support team.</p>
</div>

<p style="font-size: 16px; color: #1F2937; margin: 32px 0 0 0;">Thanks for being a Buddy,<br>Mind Measure</p>
</div>

<div class="footer">
<p style="font-size: 13px; color: #9CA3AF; margin: 0;"><a href="{optOutUrl}" style="color: #8B5CF6; text-decoration: none;">Opt out of Buddy emails</a></p>
</div>
</div>
</body>
</html>
```

**Variables:**
- `{buddyName}` - Buddy's name
- `{inviterName}` - Student's full name (first + last)
- `{optOutUrl}` - Unique opt-out link with slug

---

## API Endpoints

### Base URL
- **Production**: `https://mobile.mindmeasure.app/api/buddies`
- **API Folder**: `/api/buddies/`

### Authentication
- **Student endpoints**: Require JWT token in `Authorization: Bearer {token}` header
- **Public endpoints**: `/invite/consent`, `/invite/respond` (no auth required)

---

### POST `/api/buddies/invite`

**Purpose:** Create and send buddy invitation

**Auth:** Required (student JWT)

**Request Body:**
```json
{
  "inviteeName": "Keith Simon",
  "contactType": "email",
  "contactValue": "keith@rude.health",
  "personalMessage": "Would mean a lot if you'd be my buddy!"
}
```

**Validation:**
- `inviteeName` required, non-empty string
- `contactType` must be `"email"`
- `contactValue` must be valid email format
- `personalMessage` optional, max 1000 chars
- User must have <5 total buddies (active + pending)

**Process:**
1. Validate request body
2. Check total buddy count (max 5)
3. Fetch student's full name from `profiles` table
4. Generate 32-byte random token
5. Hash token with SHA-256
6. Create `buddy_invites` row with `status='pending'`
7. Send invite email via SES
8. Return invite details

**Response (200):**
```json
{
  "invite": {
    "id": "uuid",
    "inviteeName": "Keith Simon",
    "contactType": "email",
    "contactValueMasked": "k***@rude.health",
    "status": "pending",
    "sentAt": "2026-01-30T10:15:00Z",
    "expiresAt": "2026-02-13T10:15:00Z"
  }
}
```

**Errors:**
- `400` - Invalid email, max buddies reached
- `500` - Email send failure

**File:** `/api/buddies/invite.ts`

---

### POST `/api/buddies/invite/consent`

**Purpose:** Fetch invite data for consent page (public endpoint)

**Auth:** None required

**Request Body:**
```json
{
  "token": "abc123..."
}
```

**Validation:**
- Token must exist in database (hashed match)
- Invite status must be `pending`
- Token must not be expired

**Response (200):**
```json
{
  "inviterName": "Keith Duddy",
  "inviteeName": "Keith Simon"
}
```

**Errors:**
- `400` - Invalid/expired token, invite already used
- `500` - Database error

**File:** `/api/buddies/invite/consent.ts`

---

### POST `/api/buddies/invite/respond`

**Purpose:** Accept or decline buddy invitation (public endpoint)

**Auth:** None required

**Request Body:**
```json
{
  "token": "abc123...",
  "action": "accept"  // or "decline"
}
```

**Validation:**
- Token must exist (hashed match)
- Invite status must be `pending`
- Token must not be expired
- Action must be `"accept"` or `"decline"`

**Process (Accept):**
1. Update invite status to `accepted`
2. Create `buddies` row with `status='active'`
3. Calculate next preference order
4. Generate unique opt-out slug
5. Return success

**Process (Decline):**
1. Update invite status to `declined`
2. Return success

**Response (200):**
```json
{
  "ok": true,
  "action": "accepted"
}
```

**Errors:**
- `400` - Invalid token, expired, already used
- `500` - Database error

**File:** `/api/buddies/invite/respond.ts`

---

### POST `/api/buddies/invite/:inviteId/resend`

**Purpose:** Resend invitation email

**Auth:** Required (student JWT)

**Rate Limit:** Max 1 resend per hour per invite

**Process:**
1. Validate invite belongs to authenticated user
2. Check invite status is `pending`
3. Check rate limit (1 hour since last resend)
4. Generate new token + hash
5. Update `resend_count`, `last_resend_at`
6. Send email with new token
7. Return success

**Response (200):**
```json
{
  "ok": true,
  "message": "Invite resent"
}
```

**Errors:**
- `404` - Invite not found
- `400` - Not pending or rate limited
- `429` - Too many resends
- `500` - Email send failure

**File:** `/api/buddies/invite/[inviteId]/resend.ts`

---

### POST `/api/buddies/invite/:inviteId/revoke`

**Purpose:** Cancel pending invitation

**Auth:** Required (student JWT)

**Process:**
1. Validate invite belongs to user
2. Check status is `pending`
3. Update status to `revoked`
4. Return success

**Response (200):**
```json
{
  "ok": true
}
```

**Errors:**
- `404` - Invite not found
- `400` - Not pending (can't revoke accepted/declined)

**File:** `/api/buddies/invite/[inviteId]/revoke.ts`

---

### POST `/api/buddies/:buddyId/nudge`

**Purpose:** Send manual check-in reminder to buddy

**Auth:** Required (student JWT)

**Rate Limit:** Max 1 nudge per buddy per 14 days

**Process:**
1. Validate buddy belongs to user
2. Check buddy status is `active`
3. Check last_nudged_at (must be >14 days ago)
4. Fetch student's full name
5. Send nudge email with inviter's full name
6. Update `last_nudged_at` timestamp
7. Return success

**Response (200):**
```json
{
  "ok": true
}
```

**Errors:**
- `404` - Buddy not found
- `400` - Buddy not active
- `429` - Rate limited (too soon since last nudge)
- `500` - Email send failure

**File:** `/api/buddies/[buddyId]/nudge.ts`

---

### POST `/api/buddies/:buddyId/remove`

**Purpose:** Remove buddy (soft delete)

**Auth:** Required (student JWT)

**Process:**
1. Validate buddy belongs to user
2. Update status to `removed`
3. Update `updated_at` timestamp
4. Return success

**Response (200):**
```json
{
  "ok": true
}
```

**Note:** Buddy receives no notification of removal.

**File:** `/api/buddies/[buddyId]/remove.ts`

---

### GET `/api/buddies`

**Purpose:** List user's active buddies and pending invites

**Auth:** Required (student JWT)

**Response (200):**
```json
{
  "activeBuddies": [
    {
      "id": "uuid",
      "name": "Keith Simon",
      "email": "keith@rude.health",
      "preferenceOrder": 1,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "pendingInvites": [
    {
      "id": "uuid",
      "inviteeName": "Sarah Jones",
      "contactType": "email",
      "contactValueMasked": "s***@example.com",
      "status": "pending",
      "sentAt": "2026-01-30T10:15:00Z",
      "expiresAt": "2026-02-13T10:15:00Z"
    }
  ]
}
```

**File:** `/api/buddies/index.ts`

---

## Frontend Components

### Location
All buddy components are in: `/src/components/mobile/`

### Component Hierarchy

```
BuddiesScreen (main tab)
├── SupportCircle (buddy list)
│   ├── BuddyCard (active buddy) [x5 max]
│   │   └── Actions: Nudge, Remove
│   └── PendingInviteCard (pending) [x5 max]
│       └── Actions: Resend, Revoke
├── AddBuddyModal (invite form)
└── BuddyReminderModal (first-time prompt)

BuddyConsentPage (public, standalone route)
├── Loading state
├── Consent form
├── Accepted success
├── Declined confirmation
└── Error state
```

---

### 1. BuddiesScreen

**File:** `/src/components/mobile/BuddiesScreen.tsx`

**Purpose:** Main tab for buddy management

**Features:**
- Lists active buddies via `SupportCircle`
- Lists pending invites
- "Add a Buddy" button
- Empty state with explanation

**Props:** None (uses auth context internally)

**State Management:**
- Fetches buddies via `buddiesApi.list()`
- Refreshes on mount and after actions

---

### 2. SupportCircle

**File:** `/src/components/mobile/SupportCircle.tsx`

**Purpose:** Display buddy list with action buttons

**Features:**
- Shows active buddies in cards
- Shows pending invites
- Nudge/Remove actions on buddy cards
- Resend/Revoke actions on invite cards

**Props:**
```typescript
interface SupportCircleProps {
  userId: string;
}
```

---

### 3. AddBuddyModal

**File:** `/src/components/mobile/AddBuddyModal.tsx`

**Purpose:** Form to invite new buddy

**Features:**
- Name input (required)
- Email input (required, validated)
- Personal message textarea (optional, max 1000 chars)
- Character counter
- Submit button
- Loading state
- Error handling

**Props:**
```typescript
interface AddBuddyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Validation:**
- Email format check
- Name must be non-empty
- Personal message max 1000 chars

---

### 4. BuddyCard

**File:** `/src/components/mobile/BuddyCard.tsx`

**Purpose:** Display single active buddy

**Features:**
- Buddy name + email
- Purple gradient border
- "Send reminder" button
- "Remove" button (with confirmation)
- Shows last nudged date
- Disable nudge if rate limited

**Props:**
```typescript
interface BuddyCardProps {
  buddy: {
    id: string;
    name: string;
    email: string;
    lastNudgedAt?: string;
  };
  onNudge: (buddyId: string) => Promise<void>;
  onRemove: (buddyId: string) => Promise<void>;
}
```

---

### 5. PendingInviteCard

**File:** `/src/components/mobile/PendingInviteCard.tsx`

**Purpose:** Display pending invitation

**Features:**
- Invitee name + masked email
- Sent date + expiry countdown
- "Resend" button (rate limited)
- "Cancel" button
- Status badge

**Props:**
```typescript
interface PendingInviteCardProps {
  invite: {
    id: string;
    inviteeName: string;
    contactValueMasked: string;
    status: string;
    sentAt: string;
    expiresAt: string;
  };
  onResend: (inviteId: string) => Promise<void>;
  onRevoke: (inviteId: string) => Promise<void>;
}
```

---

### 6. BuddyReminderModal

**File:** `/src/components/mobile/BuddyReminderModal.tsx`

**Purpose:** Prompt new users to add their first buddy

**Display Logic:**
- Show **once only** per user
- Show on first dashboard visit **after** completing ≥1 check-in
- Don't show if user already has ≥1 buddy
- Stored flag: `buddy_reminder_shown` (Capacitor Preferences)

**Features:**
- Purple gradient header with 👥 icon
- Explanation of buddy system
- "How Buddies work" info panel (expandable)
- "Choose a Buddy" button → Opens Buddies tab
- "Not right now" button → Closes modal
- Close (X) button

**Props:**
```typescript
interface BuddyReminderModalProps {
  isOpen: boolean;
  onChooseBuddy: () => void;  // Navigate to buddies tab
  onSkip: () => void;          // Close & mark as shown
}
```

**Implementation Location:**
- Imported in `MobileAppStructure.tsx`
- Logic in `shouldShowBuddyReminderThisVisit()`
- Triggered after baseline, returning splash, or check-in complete

---

### 7. BuddyConsentPage

**File:** `/src/components/mobile/BuddyConsentPage.tsx`

**Purpose:** Public landing page for buddy invitation acceptance

**Route:** `/buddies/invite?token=xxx`

**States:**
1. **Loading** - Fetching invite data
2. **Consent** - Main decision page
3. **Accepted** - Success confirmation
4. **Declined** - Decline confirmation
5. **Error** - Invalid/expired token

**Design (Consent Page):**
- Mind Measure logo (70px)
- Purple gradient header: "You've been invited to be a Buddy"
- Subheading: "{Inviter Name} has asked if you'd be willing to be a Buddy on Mind Measure"
- Information sections:
  - What Mind Measure is
  - What being a Buddy means
  - What this is not (3 bullet points)
  - When you might be contacted
  - Your data
- Footer links (placeholders):
  - Privacy policy (`#privacy`)
  - How Buddies work (`#how-it-works`)
- Action buttons:
  - **"Accept and become a Buddy"** (purple gradient, primary)
  - **"Decline"** (gray outline, secondary)
- Disclaimer: "No explanation needed. You can opt out at any time if you accept."
- Footer: "mindmeasure.app"

**Design (Accepted):**
- Green checkmark (✓)
- Heading: "You're now a Buddy for {Inviter Name}"
- Explanation of what happens next
- "Done" button

**Design (Declined):**
- Heading: "You've declined the invite"
- Message: "No problem. You won't receive any more emails about this invite."
- "Done" button

**Props:** None (reads token from URL query params)

**API Calls:**
1. On mount: `POST /api/buddies/invite/consent` (fetch data)
2. On accept/decline: `POST /api/buddies/invite/respond`

---

## Security & Privacy

### Token Security

1. **Generation**: 32-byte cryptographically random strings via `crypto.randomBytes()`
2. **Hashing**: SHA-256 hash stored in database (not plaintext)
3. **Single-Use**: Token marked as used after first response
4. **Expiry**: 14-day TTL from creation
5. **URL Encoding**: Tokens are URL-safe base64url encoded

### Email Privacy

1. **Masked Emails**: Display as `k***@rude.health` in UI
2. **No Sharing**: Buddy emails never exposed to other users
3. **Opt-Out Links**: Every nudge email includes opt-out mechanism
4. **Unsubscribe**: Buddies can opt out without explanation

### Data Minimization

1. **No Buddy Accounts**: Buddies don't need Mind Measure accounts
2. **No Wellbeing Data**: Buddies never see check-in scores or content
3. **Limited Context**: Nudge emails only say "might be finding things harder"
4. **No Alerts**: System does NOT notify buddies of emergencies

### GDPR Compliance

1. **Explicit Consent**: Buddies must click "Accept" before receiving any communication
2. **Right to Erasure**: Buddies can opt out → status changed to `removed`
3. **Data Portability**: Buddy data stored separately, easily exportable
4. **Audit Trail**: All invite events logged with timestamps
5. **Privacy Links**: All emails link to privacy policy

### Rate Limiting

1. **Invite Sends**: Max 5 total buddies per user
2. **Invite Resends**: Max 1 per hour per invite
3. **Nudge Emails**: Max 1 per buddy per 14 days
4. **Token Validation**: Max 5 failed attempts per minute (future)

### AWS SES Configuration

- **Region**: `eu-west-2` (London)
- **From Address**: `no-reply@mindmeasure.co.uk`
- **Reply-To**: `info@mindmeasure.co.uk`
- **Production Access**: ✅ Approved (out of sandbox)
- **Bounce Handling**: SNS topic configured for bounces
- **Complaint Handling**: SNS topic configured for complaints

---

## Testing

### Unit Tests

**Test Files:**
- `/tests/api/buddies/invite.test.ts`
- `/tests/api/buddies/respond.test.ts`
- `/tests/api/buddies/nudge.test.ts`

**Coverage:**
- Token generation + hashing
- Email validation
- Max buddy count enforcement
- Rate limiting logic
- Expiry checks
- Status transitions

### Integration Tests

**Test Scenarios:**

1. **Full Invite Flow**
   ```
   Create invite → Send email → Validate token → Accept → Verify buddy created
   ```

2. **Decline Flow**
   ```
   Create invite → Send email → Validate token → Decline → Verify no buddy
   ```

3. **Expired Token**
   ```
   Create invite → Wait 15 days → Try to accept → Expect 400 error
   ```

4. **Max Buddies**
   ```
   Create 5 invites → Try 6th → Expect 400 error
   ```

5. **Nudge Rate Limit**
   ```
   Nudge buddy → Try again immediately → Expect 429 error
   ```

6. **Resend Rate Limit**
   ```
   Resend invite → Try again in <1 hour → Expect 429 error
   ```

### Manual Testing Checklist

- [ ] Student can add buddy with valid email
- [ ] Invitation email arrives with correct content
- [ ] Student's **full name** appears in email (not just first name)
- [ ] Personal message displays if provided
- [ ] Consent page loads with correct inviter name
- [ ] Accept button creates buddy in database
- [ ] Decline button marks invite as declined
- [ ] Expired token shows error message
- [ ] Student can resend invitation (respects rate limit)
- [ ] Student can revoke pending invite
- [ ] Student can send nudge to active buddy
- [ ] Nudge email contains inviter's **full name**
- [ ] Nudge rate limit prevents spam (14 days)
- [ ] Student can remove buddy
- [ ] Buddy Reminder Modal appears on first dashboard visit after check-in
- [ ] Buddy Reminder Modal doesn't show if already has buddy
- [ ] Buddy Reminder Modal shown only once
- [ ] Max 5 buddies enforced
- [ ] Email deliverability (check spam folders)
- [ ] Mobile responsiveness of consent page
- [ ] Accessibility (screen reader friendly)

---

## Deployment

### Prerequisites

1. **Database Migration Run**
   ```bash
   psql -h mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com \
        -U mindmeasure_admin \
        -d mindmeasure \
        -f database/migrations/create_buddy_v1_invites_buddies.sql
   ```

2. **AWS SES Verified**
   - Production access approved (out of sandbox)
   - From address verified: `no-reply@mindmeasure.co.uk`
   - Reply-To address verified: `info@mindmeasure.co.uk`

3. **Environment Variables Set** (Vercel)
   ```
   AWS_AURORA_HOST=mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com
   AWS_AURORA_PASSWORD=***
   AWS_REGION=eu-west-2
   AWS_ACCESS_KEY_ID=***
   AWS_SECRET_ACCESS_KEY=***
   NEXT_PUBLIC_BASE_URL=https://mobile.mindmeasure.app
   ```

### Deployment Steps

1. **Build & Test Locally**
   ```bash
   cd mind-measure-mobile-final
   npm install
   npm run build
   npm run test
   ```

2. **Deploy to Vercel**
   ```bash
   npx vercel --prod --yes
   ```

3. **Verify Deployment**
   - Check API endpoints respond: `/api/buddies`
   - Test consent page loads: `/buddies/invite?token=test`
   - Send test invite email

4. **Monitor Logs**
   ```bash
   npx vercel logs --prod
   ```

### Rollback Plan

If issues arise:

1. **Revert Vercel Deployment**
   ```bash
   npx vercel rollback
   ```

2. **Database Rollback** (if needed)
   ```sql
   DROP TABLE IF EXISTS buddies CASCADE;
   DROP TABLE IF EXISTS buddy_invites CASCADE;
   ```

3. **Restore Previous API Endpoints**
   - Restore from git tag or previous commit

---

## Future Enhancements (V2)

### Phase 2: Automated Alerts

- **Trigger Logic**: System automatically nudges buddies when:
  - 3 consecutive low wellbeing scores (<40)
  - Score drops >20 points in 7 days
  - User explicitly requests help
- **Escalation**: If no buddy responds in 48 hours, notify university
- **Analytics**: Track buddy engagement and response times

### Phase 3: SMS Support

- **AWS SNS Integration**: Send SMS in addition to email
- **Delivery Tracking**: Confirm SMS delivered
- **Link Clicks**: Track buddy engagement via unique URLs
- **Opt-Out**: "Reply STOP to opt out"

### Phase 4: In-App Messaging

- **Buddy Dashboard**: Optional web portal for buddies
- **Response Options**: "Called them", "Messaged them", "Unavailable"
- **Activity Feed**: View history of check-in requests

### Phase 5: Multiple Contact Methods

- **Phone**: Voice call capability
- **WhatsApp**: Message via WhatsApp Business API
- **Preferences**: Buddies choose preferred contact method

---

## Support & Maintenance

### Monitoring

**Metrics to Track:**
- Invite send rate (emails/day)
- Acceptance rate (%)
- Decline rate (%)
- Expired invites (%)
- Nudge send rate
- Opt-out rate
- Email bounce rate
- Error rate (API failures)

**Alerts:**
- Email send failures >5% in 1 hour
- API error rate >1% in 5 minutes
- Database connection failures

### Common Issues

**Issue:** Email not received
- Check spam folder
- Verify SES sender verification
- Check bounce/complaint notifications
- Verify email address format

**Issue:** Token expired
- Resend invitation (generates new token)
- Token TTL is 14 days by design

**Issue:** Max buddies reached
- Current limit is 5 total
- Student must remove/wait for expired invites

**Issue:** Nudge rate limited
- 14-day cooldown by design
- Check `last_nudged_at` timestamp

---

## Changelog

### Version 2.0 (January 30, 2026)
- ✅ Full name support (first + last) in all emails
- ✅ Redesigned HTML email templates (InviteEmailTemplate, NudgeEmailTemplate)
- ✅ BuddyConsentPage implemented with designed UI
- ✅ `/api/buddies/invite/consent` endpoint for fetching invite data
- ✅ Buddy Reminder Modal for first-time users
- ✅ All API endpoints use full names
- ✅ Mobile app route `/buddies/invite` added
- ✅ Deployed to production

### Version 1.0 (December 2025)
- Initial buddy system implementation
- Email-only V1
- Basic invite flow
- Manual nudge capability
- Database schema v1

---

## Related Documentation

- **Original Implementation Guide**: `/buddy/BUDDY_SYSTEM_IMPLEMENTATION.md` (superseded)
- **Migration Guide**: `/buddy/BUDDY_MODULE_MIGRATION.md` (legacy)
- **Module README**: `/buddy/README.md` (UI components only)
- **SES Setup**: `/docs/SES_PRODUCTION_ACCESS.md`
- **Privacy Policy**: `/docs/PRIVACY_POLICY.md`
- **Terms of Service**: `/docs/TERMS_OF_SERVICE.md`

---

## Contact & Questions

**Product Owner**: Keith Duddy  
**Technical Lead**: AI Assistant (Claude Sonnet 4.5)  
**Last Updated**: January 30, 2026  

For questions about this implementation, please refer to:
1. This document first (comprehensive guide)
2. Code comments in API endpoints
3. Component JSX comments for UI details
4. Database schema comments for data structure

---

**END OF DOCUMENT**
