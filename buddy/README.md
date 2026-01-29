# Buddy Module

This folder contains all components for the V1 email-only Buddy system for Mind Measure.

## 📁 Contents

### Core Components
- **`SupportCircle.tsx`** - Main Buddy management interface with invite/nudge controls
- **`AddBuddyModal.tsx`** - Modal for inviting new Buddies  
- **`BuddyCard.tsx`** - Individual Buddy card with drag-and-drop reordering
- **`PendingInviteCard.tsx`** - Card showing pending invites with resend/cancel actions
- **`BuddyReminderModal.tsx`** - Modal prompting users to add their first Buddy
- **`BuddyResponseModal.tsx`** - Success/decline response modals
- **`BuddyConsentDemo.tsx`** - Demo consent landing page (3 states: consent, accepted, declined)

### Module Files
- **`index.ts`** - Barrel export for all components
- **`README.md`** - This file

## 📖 Full Implementation Guide

See `/BUDDY_IMPLEMENTATION_GUIDE.md` at the project root for:
- Complete database schema
- All email templates with exact copy
- API endpoint specifications
- Security requirements
- Consent page HTML
- Backend implementation details

## 🎨 Design System

All components use Mind Measure's design system:
- **Primary gradient**: `linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)`
- **Typography**: System fonts with 600 weight for headings
- **Spacing**: 16px/24px/32px grid
- **Shadows**: Soft with purple tint for primary actions

## 🔌 Usage

### Basic Import
```tsx
import { SupportCircle } from '@/app/components/buddy';
```

### All Components
```tsx
import {
  SupportCircle,
  AddBuddyModal,
  BuddyCard,
  BuddyReminderModal,
  BuddyResponseModal,
  BuddyConsentDemo,
  PendingInviteCard
} from '@/app/components/buddy';
```

## 📋 Implementation Checklist

- [ ] Set up database schema from implementation guide
- [ ] Configure email service (SendGrid/AWS SES/Postmark)
- [ ] Create token generation system for consent URLs
- [ ] Implement consent page at `/buddy-invite/{token}`
- [ ] Set up webhook/API endpoints for accept/decline
- [ ] Configure automatic nudge trigger logic (backend)
- [ ] Add rate limiting for manual nudges
- [ ] Implement opt-out handling
- [ ] Test email deliverability
- [ ] Review security and privacy compliance

## ⚠️ Important Notes

1. **Email-only**: V1 uses email exclusively - no SMS, no in-app messaging
2. **One-time tokens**: All consent URLs must be single-use and expire after 14 days  
3. **No escalation**: Only ONE Buddy is ever nudged per event
4. **Privacy first**: Buddies never see scores, check-ins, or app data
5. **Clean exits**: Decline/opt-out require no explanation or reason

## 🔗 Related Documentation

- Main Implementation Guide: `/BUDDY_IMPLEMENTATION_GUIDE.md`
- Email Templates: See implementation guide Section 5
- Database Schema: See implementation guide Section 2
- API Endpoints: See implementation guide Section 6
