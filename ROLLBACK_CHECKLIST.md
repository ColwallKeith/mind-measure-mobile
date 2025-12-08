# Rollback Checklist

**⚠️ IMPORTANT**: Follow this checklist BEFORE performing any rollback to prevent "Frankenstein" code issues.

Last updated: 2025-12-08 (after SDK migration incident)

---

## Pre-Rollback Assessment

### Step 1: Understand What You're Rolling Back

```bash
# See commits between target and current
git log --oneline --stat <target_commit>..HEAD

# Look specifically for:
# - package.json changes (dependencies)
# - Component file renames/moves
# - Database schema changes
# - Configuration changes
```

**Questions to answer:**
- [ ] Why are we rolling back? (bug, performance, other)
- [ ] What's the target commit hash?
- [ ] How many commits will be lost?
- [ ] When was the target commit created?
- [ ] Who can I ask about changes since then?

### Step 2: Identify Breaking Changes

Check for these CRITICAL changes in the commits you're about to revert:

#### Dependency Changes

```bash
# Check for package.json changes
git diff <target_commit>..HEAD -- package.json

# Look for:
# - SDK version changes (e.g., @11labs/client → @elevenlabs/react)
# - Major version bumps
# - Removed packages
# - Added packages
```

**Breaking Dependency Changes Found:**
- [ ] None
- [ ] List them here: _______________

#### Architectural Changes

```bash
# Check for component renames/splits
git diff <target_commit>..HEAD --name-status -- "src/components/**/*.tsx"

# Look for:
# - Renamed files (R)
# - Deleted files (D)
# - New files (A)
```

**Architectural Changes Found:**
- [ ] None
- [ ] Component splits: _______________
- [ ] Component renames: _______________
- [ ] New patterns introduced: _______________

#### Database Changes

```bash
# Check for schema changes
git diff <target_commit>..HEAD -- "**/*migration*" "**/*schema*"
```

**Database Changes Found:**
- [ ] None
- [ ] New tables: _______________
- [ ] New columns: _______________
- [ ] Migrations to rollback: _______________

#### Configuration Changes

```bash
# Check for config changes
git diff <target_commit>..HEAD -- "*.config.*" ".env*" "capacitor.config*"
```

**Config Changes Found:**
- [ ] None
- [ ] Environment variables: _______________
- [ ] Build config: _______________
- [ ] Capacitor config: _______________

---

## Pre-Rollback Safety

### Step 3: Create Safety Net

```bash
# 1. Tag current state
git tag before-rollback-$(date +%Y%m%d-%H%M%S)

# 2. Create backup branch
git branch backup-before-rollback-$(date +%Y%m%d)

# 3. Save commits as patches (can re-apply later)
git format-patch <target_commit>..HEAD -o rollback-patches/

# 4. Push everything to remote
git push --tags
git push origin backup-before-rollback-$(date +%Y%m%d)
```

**Safety Net Created:**
- [ ] Tag created: _______________
- [ ] Backup branch created: _______________
- [ ] Patches saved to: _______________
- [ ] Pushed to remote

### Step 4: Test Rollback in Isolation

**NEVER rollback directly on main/master!**

```bash
# 1. Create test branch
git checkout -b rollback-test-$(date +%Y%m%d)

# 2. Perform rollback
git reset --hard <target_commit>

# 3. Check if dependencies need reinstall
npm ci

# 4. Try to build
npm run build 2>&1 | tee rollback-build-log.txt

# 5. Check for missing files
npm run check-layout
```

**Build Result:**
- [ ] ✅ Build succeeded
- [ ] ❌ Build failed - Errors: _______________

**Missing Files/Imports:**
- [ ] None found
- [ ] List missing: _______________

### Step 5: Verify Critical Functionality

```bash
# Start dev server
npm run dev
```

**Manual Testing Checklist:**
- [ ] App loads without errors
- [ ] Login works
- [ ] Baseline welcome screen shows correct text ("Five questions", not "Six")
- [ ] Baseline assessment conversation starts
- [ ] Dashboard loads after baseline complete
- [ ] Check-ins work
- [ ] No console errors in browser

**Test Results:**
- [ ] ✅ All tests passed
- [ ] ❌ Tests failed - Issues: _______________

---

## Performing the Rollback

### Step 6: Execute Rollback (if tests passed)

If the rollback test branch worked correctly:

```bash
# Switch to main
git checkout main

# Pull latest (in case anything changed)
git pull

# Perform the rollback
git reset --hard <target_commit>

# Force push (with lease for safety)
git push --force-with-lease

# Redeploy
npm run build
npx vercel --prod
npx cap sync ios
```

**Rollback Executed:**
- [ ] Git reset completed
- [ ] Force push completed
- [ ] Deployment completed
- [ ] iOS sync completed

### Step 7: Post-Rollback Verification

```bash
# Run automated checks
npm run check-layout
npm run typecheck

# Test critical flows
npm run test:e2e
```

**Production Verification:**
- [ ] Production site loads
- [ ] Critical flows work
- [ ] No errors in Vercel logs
- [ ] Mobile app works

---

## Common Rollback Scenarios

### Scenario A: Rolling Back SDK Migration

**Example**: Reverting from `@elevenlabs/react` back to `@11labs/client`

**Special Steps:**
1. Check ALL files that import ElevenLabs SDK:
   ```bash
   rg "elevenlabs" -t tsx -t ts
   ```

2. Verify old SDK is in package.json:
   ```bash
   npm list @11labs/client
   ```

3. If missing, reinstall:
   ```bash
   npm install @11labs/client@<version>
   npm uninstall @elevenlabs/react
   ```

4. Update check-layout.js:
   - Remove checks for new SDK
   - Add checks for old SDK

**Files to manually verify:**
- [ ] `BaselineAssessmentSDK.tsx`
- [ ] `CheckinAssessment.tsx`
- [ ] Any other files importing SDK

### Scenario B: Rolling Back Component Split

**Example**: Reverting `BaselineWelcome.tsx` split back to monolithic `BaselineAssessmentSDK.tsx`

**Special Steps:**
1. Get the old combined component:
   ```bash
   git show <pre-split-commit>:src/components/mobile/BaselineAssessmentSDK.tsx > temp-combined.tsx
   ```

2. Compare what's different:
   ```bash
   diff temp-combined.tsx src/components/mobile/BaselineAssessmentSDK.tsx
   ```

3. Merge the welcome screen logic back in

4. Update imports in `MobileAppStructure.tsx`

5. Delete the split file:
   ```bash
   git rm src/components/mobile/BaselineWelcome.tsx
   ```

### Scenario C: Rolling Back Database Changes

**Special Steps:**
1. Run down migrations FIRST:
   ```bash
   # Before git reset!
   npm run migrate:down
   ```

2. Then perform git rollback

3. Verify database schema matches code

---

## Emergency Recovery

### If Rollback Causes Production Issues

```bash
# 1. Immediately revert the rollback
git reset --hard before-rollback-<timestamp>
git push --force-with-lease

# 2. Redeploy
npm run build
npx vercel --prod

# 3. Investigate what went wrong
# - Check Vercel logs
# - Check browser console
# - Check mobile app logs

# 4. If needed, cherry-pick specific fixes
git cherry-pick <commit-hash-of-fix>
```

### If You Need Specific Changes from Lost Commits

```bash
# Option 1: Apply patches
git apply rollback-patches/0001-*.patch

# Option 2: Cherry-pick from backup branch
git cherry-pick backup-before-rollback-<date>~3  # Pick 3rd commit from end

# Option 3: Interactive rebase to pick commits
git rebase -i backup-before-rollback-<date>
```

---

## Checklist Summary

Before any rollback, ensure:

- [ ] ✅ I understand WHY we're rolling back
- [ ] ✅ I've identified all breaking changes
- [ ] ✅ I've created safety tags/branches
- [ ] ✅ I've tested rollback in a branch first
- [ ] ✅ I've verified critical functionality works
- [ ] ✅ I've saved patches for re-applying changes
- [ ] ✅ I've documented what went wrong
- [ ] ✅ I have a recovery plan if rollback fails

**Sign-off:**
- Requested by: _______________
- Approved by: _______________
- Executed by: _______________
- Date: _______________

---

## Lessons Learned Template

After completing a rollback, document what happened:

**What went wrong?**
- 

**Why did we roll back?**
- 

**What breaking changes did we encounter?**
- 

**How long did recovery take?**
- 

**What could we have done to prevent this?**
- 

**What safeguards should we add?**
- 

---

## References

- [DEVELOPMENT_SAFEGUARDS.md](./DEVELOPMENT_SAFEGUARDS.md) - Prevention system
- [POSTMORTEM_2025_12_08.md](./POSTMORTEM_2025_12_08.md) - Example of what can go wrong
- [docs/adr/](./docs/adr/) - Architecture decisions that might be affected by rollbacks

