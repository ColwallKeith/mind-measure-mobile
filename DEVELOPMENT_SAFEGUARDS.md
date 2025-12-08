# Development Safeguards & Rollback Prevention

**Created**: Dec 8, 2025  
**Context**: After 2+ hour recovery from rollback that mixed incompatible SDK versions

## The Problem We're Solving

Rollbacks can create "Frankenstein" codebases where:
- Different API versions are mixed (e.g., `@11labs/client` vs `@elevenlabs/react`)
- Component architectures conflict (embedded screens vs separate components)
- Visual regressions go undetected until manual testing
- Git history fragmentation makes it hard to understand changes

## Prevention System

### 1. Visual Regression Testing

**Tool**: Percy, Chromatic, or Playwright visual testing

**Implementation**:
```bash
# Install Playwright
npm install -D @playwright/test

# Add visual snapshot tests
# tests/visual/baseline-flow.spec.ts
import { test, expect } from '@playwright/test';

test('baseline welcome screen layout', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Navigate to baseline welcome
  await page.screenshot({ path: 'snapshots/baseline-welcome.png', fullPage: true });
  
  // Check critical elements
  await expect(page.locator('text=What to expect')).toBeVisible();
  await expect(page.locator('text=Five questions from Jodie')).toBeVisible();
  await expect(page.locator('button:has-text("Start Your Baseline Assessment")')).toBeVisible();
});

test('baseline assessment conversation UI', async ({ page }) => {
  // ... similar for conversation screen
});
```

**Run before deployment**:
```bash
npm run test:visual
```

### 2. Component Snapshot Testing

**Tool**: Jest + React Testing Library

**Implementation**:
```typescript
// src/components/mobile/__tests__/BaselineWelcome.test.tsx
import { render } from '@testing-library/react';
import { BaselineWelcome } from '../BaselineWelcome';

describe('BaselineWelcome', () => {
  it('matches snapshot', () => {
    const { container } = render(<BaselineWelcome onStartAssessment={jest.fn()} />);
    expect(container).toMatchSnapshot();
  });
  
  it('shows exactly 5 bullet points', () => {
    const { getAllByRole } = render(<BaselineWelcome onStartAssessment={jest.fn()} />);
    const listItems = getAllByRole('listitem');
    expect(listItems).toHaveLength(5);
    expect(listItems[0]).toHaveTextContent('Five questions from Jodie');
  });
});
```

### 3. Architecture Decision Records (ADRs)

**Location**: `/docs/adr/`

**Template**:
```markdown
# ADR-XXX: Switch from @11labs/client to @elevenlabs/react

## Status
Accepted

## Date
2025-11-XX

## Context
The old @11labs/client SDK requires manual session management and is deprecated.

## Decision
Use @elevenlabs/react with useConversation hook for all ElevenLabs integrations.

## Consequences
- BREAKING: Cannot mix old and new SDKs in the same component
- MIGRATION: Any file importing `@11labs/client` must be fully updated
- FILES AFFECTED: BaselineAssessmentSDK.tsx, CheckinAssessment.tsx

## Rollback Safety
If reverting commits after this date, ensure:
1. Only revert files that DON'T import @elevenlabs/react
2. If you must revert a file with @elevenlabs/react, you MUST also revert all its dependencies
```

### 4. Pre-Commit Layout Checks

**Tool**: Husky + custom script

**Implementation**:
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run check-critical-layout"
    }
  },
  "scripts": {
    "check-critical-layout": "node scripts/check-layout.js"
  }
}
```

```javascript
// scripts/check-layout.js
const fs = require('fs');
const path = require('path');

const CRITICAL_STRINGS = [
  { file: 'src/components/mobile/BaselineWelcome.tsx', text: 'Five questions from Jodie', reason: 'Must say "Five" not "Six"' },
  { file: 'src/components/mobile/BaselineAssessmentSDK.tsx', text: '@elevenlabs/react', reason: 'Must use modern SDK' },
  { file: 'src/components/mobile/MobileAppStructure.tsx', text: 'BaselineAssessmentSDK', reason: 'Must import SDK not widget' }
];

let failed = false;

for (const check of CRITICAL_STRINGS) {
  const filePath = path.join(__dirname, '..', check.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ MISSING FILE: ${check.file}`);
    failed = true;
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes(check.text)) {
    console.error(`❌ CRITICAL LAYOUT ERROR in ${check.file}`);
    console.error(`   Expected: "${check.text}"`);
    console.error(`   Reason: ${check.reason}`);
    failed = true;
  }
}

if (failed) {
  console.error('\n💥 Commit blocked: Critical layout checks failed');
  process.exit(1);
} else {
  console.log('✅ Layout checks passed');
}
```

### 5. Dependency Lock with Verification

**Implementation**:
```json
// package.json - add dependency validation
{
  "scripts": {
    "postinstall": "node scripts/verify-deps.js"
  }
}
```

```javascript
// scripts/verify-deps.js
const pkg = require('../package.json');

const FORBIDDEN_COMBINATIONS = [
  {
    packages: ['@11labs/client', '@elevenlabs/react'],
    reason: 'Cannot have both old and new ElevenLabs SDKs'
  }
];

for (const forbidden of FORBIDDEN_COMBINATIONS) {
  const installed = forbidden.packages.filter(p => 
    pkg.dependencies[p] || pkg.devDependencies[p]
  );
  
  if (installed.length > 1) {
    console.error(`❌ FORBIDDEN DEPENDENCY COMBINATION: ${installed.join(', ')}`);
    console.error(`   Reason: ${forbidden.reason}`);
    process.exit(1);
  }
}
```

### 6. Rollback Checklist

**File**: `ROLLBACK_CHECKLIST.md`

```markdown
# Before Any Rollback

## Step 1: Identify Breaking Changes
```bash
# See what changed in the range you're rolling back
git log --oneline --stat <target_commit>..HEAD

# Look for:
# - Package.json changes (SDK upgrades)
# - Component file renames/moves
# - Database schema changes
```

## Step 2: Test Rollback in Branch First
```bash
# NEVER rollback on main
git checkout -b rollback-test
git reset --hard <target_commit>
npm install
npm run build
npm run test:visual  # Visual regression tests
npm start  # Manual smoke test
```

## Step 3: Document What You're Losing
```bash
# Create a backup of commits you're about to lose
git format-patch <target_commit>..HEAD -o rollback-patches/

# This creates .patch files you can re-apply later
```

## Step 4: Rollback with Safety Net
```bash
# Tag current state before rollback
git tag before-rollback-$(date +%Y%m%d)

# Now rollback
git reset --hard <target_commit>
git push --force-with-lease
```

## Step 5: Verify Critical Flows
- [ ] Login works
- [ ] Baseline welcome shows "Five questions" (not "Six")
- [ ] BaselineAssessmentSDK uses @elevenlabs/react (not @11labs/client)
- [ ] Dashboard loads after baseline complete
- [ ] Check-ins work
```

### 7. Component Version Tagging

**Implementation**: Add version comments to critical components

```typescript
// src/components/mobile/BaselineAssessmentSDK.tsx
/**
 * BaselineAssessmentSDK Component
 * 
 * @version 2.0.0
 * @sdk @elevenlabs/react (useConversation hook)
 * @breaking-changes
 *   - v2.0.0: Migrated from @11labs/client to @elevenlabs/react
 *   - v1.5.0: Split "What to expect" screen into BaselineWelcome component
 * 
 * @rollback-safety
 *   If reverting this file, you MUST:
 *   1. Check package.json has @elevenlabs/react (not @11labs/client)
 *   2. Ensure BaselineWelcome.tsx exists and is imported correctly
 *   3. Run `npm run test:baseline` before deploying
 */
```

### 8. Automated Smoke Tests

**Tool**: Playwright E2E tests

```typescript
// tests/e2e/baseline-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Baseline Assessment Flow', () => {
  test('complete flow from login to dashboard', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button:has-text("Sign In")');
    
    // Start baseline
    await page.click('button:has-text("Get Started")');
    
    // Check "What to expect" screen
    await expect(page.locator('text=Five questions from Jodie')).toBeVisible();
    await expect(page.locator('text=3-5 minutes max')).toBeVisible();
    
    // Start assessment
    await page.click('button:has-text("Start Your Baseline Assessment")');
    
    // Wait for conversation to load
    await expect(page.locator('text=Baseline Assessment')).toBeVisible();
    
    // Verify modern SDK indicators
    await expect(page.locator('[data-testid="conversation-container"]')).toBeVisible();
  });
});
```

**Run before every deployment**:
```json
{
  "scripts": {
    "predeploy": "npm run test:e2e && npm run test:visual"
  }
}
```

## Immediate Actions

1. **Install Testing Tools** (30 mins):
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

2. **Create First Visual Test** (1 hour):
   - Baseline welcome screen
   - Baseline conversation UI
   - Dashboard with scores

3. **Set Up Pre-Commit Hook** (30 mins):
   ```bash
   npm install -D husky
   npx husky install
   npx husky add .husky/pre-commit "npm run check-critical-layout"
   ```

4. **Document Current State** (30 mins):
   - Create ADR for @elevenlabs/react migration
   - Tag current commit as `stable-baseline-v2.0`
   - Take screenshots of all screens

## Cost-Benefit

**Time Investment**: ~3 hours initial setup  
**Time Saved**: Eliminates 2+ hour debugging sessions like today  
**Confidence**: Deploy with certainty that layouts haven't regressed

## When to Use Each Tool

| Situation | Tool |
|-----------|------|
| Checking if layout changed | Visual regression tests (Playwright) |
| Ensuring component structure intact | Snapshot tests (Jest) |
| Preventing incompatible SDK mix | Dependency verification script |
| Understanding past decisions | Architecture Decision Records |
| Before any rollback | Rollback checklist |
| Before every commit | Pre-commit layout checks |
| Before every deployment | E2E smoke tests |

## Emergency Recovery

If you ever get into today's situation again:

```bash
# 1. Don't panic - create a recovery branch
git checkout -b emergency-recovery

# 2. Check what's actually wrong
npm run check-critical-layout  # Our new script
npm run test:visual  # Visual tests

# 3. Use git bisect to find when it broke
git bisect start
git bisect bad HEAD
git bisect good <last_known_good_commit>
# Git will checkout commits - test each one
npm run build && npm run test:visual
git bisect good  # or bad

# 4. Once found, cherry-pick the good changes
git cherry-pick <good_commit>
```

