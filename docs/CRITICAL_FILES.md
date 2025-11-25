# Critical Files - DO NOT DELETE

## ⚠️ NEVER DELETE THESE FILES ⚠️

This document lists files that are critical to the application and must NEVER be deleted without explicit approval.

### 1. `src/components/mobile/BaselineAssessmentSDK.tsx`

**Status:** ACTIVE - This is THE baseline assessment file  
**DO NOT USE:** `BaselineAssessment.tsx` (old widget version)

**What it contains:**
- ElevenLabs SDK integration (not widget)
- iMessage-style chat bubbles:
  - Jodie: light purple/pink (#faf5ff), left-aligned, rounded with tail
  - User: light blue (#eff6ff), right-aligned, rounded with tail
- Finish button with:
  - Haptic feedback (Heavy impact)
  - Click sound
  - Purple gradient with white text
  - Larger, more responsive design
- Mood score extraction that handles:
  - Digit responses (e.g., "7")
  - Word responses (e.g., "six")
- Strict validation:
  - ALL 5 questions must be answered
  - Mood score required
  - Minimum transcript length
  - Minimum duration
- Database inserts:
  - `assessment_transcripts` table (with session_id, agent_id)
  - `assessment_items` table (with item_number)
  - `fusion_outputs` table (with provisional scoring)

**History:**
- This file was lost on 2025-11-25 because it was never committed
- Caused major confusion and wasted 2+ hours
- Now protected by git pre-commit hook

**Protection:**
- Pre-commit hook prevents accidental deletion
- Must be committed immediately after any changes
- Changes must be tested before deployment

---

### 2. `src/components/mobile/MobileAppStructure.tsx`

**Status:** ACTIVE - Main app navigation structure

**What it does:**
- Manages onboarding flow (splash → registration → verification → sign-in → baseline → dashboard)
- Handles authenticated vs non-authenticated states
- Controls tab navigation
- Enforces baseline requirement before accessing main app

**Critical imports:**
- ✅ `BaselineAssessmentSDK` (NOT BaselineAssessment)
- ✅ `BaselineAssessmentScreen` (welcome screen)

---

### 3. `src/services/UniversityResolver.ts`

**Status:** ACTIVE - University domain assignment

**What it does:**
- Resolves university from email domain
- Queries `universities` table with `domains` column (JSON array)
- Used during profile creation in baseline flow

---

## Git Protection

A pre-commit hook is installed at `.git/hooks/pre-commit` that prevents deletion of these files.

To bypass (ONLY if intentional):
```bash
git commit --no-verify
```

**WARNING:** Only bypass if you are explicitly replacing the file with a better version.

---

## Deployment Protocol

When making changes to these files:

1. ✅ Make changes
2. ✅ Test locally (if possible)
3. ✅ **COMMIT IMMEDIATELY** with descriptive message
4. ✅ Push to GitHub
5. ✅ Deploy to Vercel
6. ✅ Sync to iOS with `npx cap sync ios`
7. ✅ Test on device

**NEVER** leave uncommitted changes to these files in your working directory.

---

## Recovery Procedure

If these files are accidentally deleted:

1. Check git history:
   ```bash
   git log --all --full-history -- "path/to/file"
   ```

2. Restore from git:
   ```bash
   git checkout HEAD~1 -- path/to/file
   ```

3. Check stash:
   ```bash
   git stash list
   git stash show -p stash@{0}
   ```

4. If not in git history, the file was NEVER committed - check with Keith immediately.

---

Last Updated: 2025-11-25  
Incident: BaselineAssessmentSDK.tsx lost and recovered

