# Testing & Safeguards Installation Guide

This guide helps you install and configure all the prevention systems we've created.

## Quick Start (5 minutes)

Already working:
- ✅ Layout verification script (`scripts/check-layout.js`)
- ✅ Pre-deploy checks (`predeploy` script)
- ✅ Architecture Decision Records (ADRs)
- ✅ Rollback checklist

Need to install:
- Playwright for visual regression tests
- Husky for git hooks (optional but recommended)

---

## Step 1: Install Playwright (Required for Visual Tests)

### Install Playwright

Due to the npm error encountered, use this alternative approach:

```bash
# Clean npm cache
npm cache clean --force

# Try installing without cache
npm install -D @playwright/test --legacy-peer-deps

# Or use yarn if you have it
# yarn add -D @playwright/test
```

### Install Chromium Browser

```bash
# Install just Chromium (lighter weight)
npx playwright install chromium
```

### Verify Installation

```bash
# Check Playwright version
npx playwright --version

# Should output: Version 1.4x.x
```

---

## Step 2: Run Your First Visual Test

### Start Dev Server (Terminal 1)

```bash
npm run dev
```

### Run Tests (Terminal 2)

```bash
# Run all visual tests
npm run test:visual

# Run with UI mode (interactive)
npm run test:ui

# Run all tests
npm run test:all
```

### Expected Output (First Run)

```
Running 5 tests using 1 worker

  ✓ Baseline Welcome Screen > renders with correct layout and text
  ✓ Baseline Assessment - What to Expect Screen > shows exactly five questions
  ○ Baseline Assessment - Conversation UI > conversation screen layout (skipped - no conversation active)
  ✓ SDK Version Verification > uses modern @elevenlabs/react SDK
  
5 passed (2.3s)
```

Some tests may be skipped on first run - that's okay!

---

## Step 3: Set Up Husky Git Hooks (Optional but Recommended)

### Install Husky

```bash
npm install -D husky
```

### Initialize Husky

```bash
# Enable Git hooks
npx husky install

# Set up to run automatically after npm install
npm pkg set scripts.prepare="husky install"
```

### Verify Pre-Commit Hook

```bash
# The pre-commit hook should already exist in .husky/pre-commit
# Test it:
git add -A
git commit -m "test: verify pre-commit hook"

# You should see:
# 🔍 Running pre-commit checks...
# ✅ Pre-commit checks passed!
```

If the hook doesn't trigger, manually create it:

```bash
echo '#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run check-layout' > .husky/pre-commit

chmod +x .husky/pre-commit
```

---

## Step 4: Generate Reference Screenshots

After confirming the UI is correct:

```bash
# Start dev server
npm run dev

# In another terminal, generate screenshots
npx playwright test tests/visual --update-snapshots
```

This creates baseline images that future tests will compare against.

---

## Step 5: Test the Safety Net

### Test Layout Verification

```bash
npm run check-layout
```

Expected output:
```
🔍 Running critical layout verification...

Ran 13 checks across 6 files

✅ All critical layout checks passed!
   13/13 checks successful
```

### Test Pre-Commit Hook

```bash
# Make a breaking change
echo "import { Conversation } from '@11labs/client';" >> src/components/mobile/BaselineAssessmentSDK.tsx

# Try to commit
git add -A
git commit -m "test: break the build"

# Should see:
# ❌ CRITICAL LAYOUT ERRORS DETECTED
# ERROR: src/components/mobile/BaselineAssessmentSDK.tsx
#   FORBIDDEN STRING FOUND: "@11labs/client"
#   Reason: Old SDK is incompatible with current code
```

Remember to undo the breaking change:
```bash
git checkout src/components/mobile/BaselineAssessmentSDK.tsx
```

---

## Step 6: Configure Your CI/CD (Optional)

### For Vercel

Add to your project settings:

**Build Command**:
```bash
npm run check-layout && npm run build
```

**Install Command**:
```bash
npm ci && npm run playwright:install
```

### For GitHub Actions

Create `.github/workflows/tests.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run layout checks
        run: npm run check-layout
      
      - name: Install Playwright
        run: npx playwright install chromium --with-deps
      
      - name: Run visual tests
        run: npm run test:visual
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: playwright-report/
```

---

## Available Commands

### Testing Commands

```bash
# Layout verification (runs before deploy)
npm run check-layout

# Visual regression tests
npm run test:visual

# E2E smoke tests
npm run test:e2e

# All tests
npm run test:all

# Interactive test UI
npm run test:ui

# Install Playwright browsers
npm run playwright:install
```

### Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Troubleshooting

### Playwright Won't Install

**Error**: `ENOTEMPTY: directory not empty`

**Solution**:
```bash
# Option 1: Use legacy peer deps
npm install -D @playwright/test --legacy-peer-deps

# Option 2: Clean install
rm -rf node_modules package-lock.json
npm install
npm install -D @playwright/test

# Option 3: Use yarn
yarn add -D @playwright/test
```

### Pre-Commit Hook Not Running

**Solution**:
```bash
# Verify hook exists and is executable
ls -la .husky/pre-commit
chmod +x .husky/pre-commit

# Verify Git hooks are enabled
git config core.hooksPath

# Should output: .husky
```

### Tests Failing on First Run

This is normal! First run establishes baselines:

```bash
# Generate baseline screenshots
npx playwright test --update-snapshots

# Then run tests normally
npm run test:visual
```

### "Cannot find module" Errors

**Solution**:
```bash
# Reinstall dependencies
npm ci

# Verify Playwright is installed
npm list @playwright/test
```

---

## What Gets Checked?

### Layout Verification (`check-layout`)

Verifies:
- ✅ Modern SDK in use (`@elevenlabs/react`)
- ✅ No old SDK imports (`@11labs/client`)
- ✅ Correct text ("Five questions", not "Six")
- ✅ Correct component imports
- ✅ Required props present

### Visual Tests (`test:visual`)

Captures:
- Baseline welcome screen layout
- "What to expect" card positioning
- Button spacing from card
- Conversation UI layout
- Message bubble styling

### E2E Tests (`test:e2e`)

Validates:
- App loads without errors
- No critical console errors
- Responsive layout on mobile
- Components load correctly
- No missing assets

---

## Next Steps

### Immediate (Done)
- [x] Created all test files
- [x] Created ADRs
- [x] Created rollback checklist
- [x] Integrated checks into deployment

### This Week
- [ ] Install Playwright successfully
- [ ] Run first visual test
- [ ] Set up Husky hooks
- [ ] Generate reference screenshots

### This Month
- [ ] Add more visual test cases
- [ ] Set up CI/CD integration
- [ ] Create component snapshot tests
- [ ] Train team on ADR process

---

## Getting Help

### Documentation
- [Playwright Docs](https://playwright.dev)
- [DEVELOPMENT_SAFEGUARDS.md](./DEVELOPMENT_SAFEGUARDS.md) - Full prevention system
- [ROLLBACK_CHECKLIST.md](./ROLLBACK_CHECKLIST.md) - How to safely rollback
- [docs/adr/](./docs/adr/) - Architecture decisions

### Test Examples
- `tests/visual/baseline-flow.spec.ts` - Visual regression examples
- `tests/e2e/smoke-tests.spec.ts` - E2E test examples

### Scripts
- `scripts/check-layout.js` - Layout verification logic

---

## Success Metrics

You'll know the system is working when:

✅ **Pre-commit hook blocks bad commits**
- Try to import old SDK → blocked
- Try to change "Five" to "Six" → blocked

✅ **Visual tests catch regressions**
- Change layout → test fails with visual diff

✅ **E2E tests catch broken flows**
- Break conversation start → test fails

✅ **Rollback checklist prevents incidents**
- Follow checklist → safe rollback
- Skip checklist → caught in test branch

---

## Time Investment

- **Initial setup**: 15-30 minutes (this guide)
- **First test run**: 5 minutes
- **Maintenance**: 5 minutes per new critical component

**Time saved**: 2+ hours per prevented incident (see POSTMORTEM_2025_12_08.md)

---

Last updated: 2025-12-08

