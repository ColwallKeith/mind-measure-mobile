# ADR-002: Separate BaselineWelcome from BaselineAssessmentSDK

## Status

**Accepted**

**Date**: 2025-11-25 (Approximate)

## Context

The baseline assessment flow has two distinct screens:

1. **Welcome Screen**: Introduces the user to baseline assessment, explains what it measures, shows benefits
2. **"What to Expect" Screen**: Shows 5 specific bullet points about the assessment process, has the "Start" button
3. **Conversation Screen**: The actual ElevenLabs conversation with Jodie

Originally, all three screens were managed within a single `BaselineAssessmentSDK.tsx` component using internal state to toggle between them. This created a large component (~800 lines) with multiple responsibilities.

**Problems with the monolithic approach:**
- Single component had too many responsibilities (welcome UI + conversation logic)
- Difficult to reuse welcome screen without pulling in SDK dependencies
- Testing was complex - had to mock entire ElevenLabs SDK to test welcome UI
- Welcome screen layout changes required touching conversation logic
- Component file was becoming difficult to navigate

**User requirements:**
- Two-screen flow before starting conversation: Welcome → What to Expect → Conversation
- Consistent branding and smooth transitions
- Ability to go back from "What to Expect" to "Welcome"

## Decision

**We will split the baseline assessment into two separate components:**

1. **`BaselineWelcome.tsx`**: 
   - Exports `BaselineAssessmentScreen` component
   - Manages internal state for Welcome → "What to Expect" transition
   - No ElevenLabs SDK dependencies
   - Takes `onStartAssessment` callback prop

2. **`BaselineAssessmentSDK.tsx`**:
   - Handles only the conversation screen
   - Uses ElevenLabs SDK
   - Manages conversation state and assessment data
   - Takes `onComplete` and `onBack` callback props

**Component responsibilities:**

```typescript
// BaselineWelcome.tsx
export function BaselineAssessmentScreen({ 
  onStartAssessment 
}: { 
  onStartAssessment: () => void 
}) {
  const [showWelcome, setShowWelcome] = useState(true);
  
  // Internal: Welcome → What to Expect
  // External: What to Expect → calls onStartAssessment()
}

// BaselineAssessmentSDK.tsx
export function BaselineAssessmentSDK({ 
  onComplete, 
  onBack 
}: { 
  onComplete: () => void; 
  onBack?: () => void;
}) {
  // Only handles conversation and assessment logic
}
```

**Flow in `MobileAppStructure.tsx`:**

```typescript
case 'baseline_welcome':
  return <BaselineAssessmentScreen 
    onStartAssessment={() => setOnboardingScreen('baseline_assessment')} 
  />;

case 'baseline_assessment':
  return <BaselineAssessmentSDK 
    onComplete={() => { /* go to dashboard */ }}
    onBack={() => setOnboardingScreen('baseline_welcome')}
  />;
```

## Consequences

### Positive Consequences

- **Separation of concerns**: UI component separate from SDK logic
- **Better testability**: Can test welcome screens without mocking SDK
- **Easier maintenance**: Changes to welcome UI don't touch conversation logic
- **Smaller files**: Each component is focused and easier to understand
- **Reusability**: Could reuse welcome screen for other contexts
- **Clearer state management**: Each component manages its own internal state

### Negative Consequences

- **More files**: Two components instead of one
- **Prop drilling**: Need to pass callbacks through MobileAppStructure
- **Potential confusion**: Developers need to know about both components
- **Duplication risk**: Some styling might be duplicated between components

### Neutral Consequences

- Same user experience, different implementation
- No performance impact
- Total lines of code stays roughly the same

## Alternatives Considered

### Alternative 1: Keep everything in one component

- **Pros**: Single source of truth, no prop passing
- **Cons**: Large file, mixed responsibilities, hard to test
- **Why not chosen**: Component was becoming too large and difficult to maintain

### Alternative 2: Three separate components (Welcome, WhatToExpect, Conversation)

- **Pros**: Maximum separation, each screen is independent
- **Cons**: More files, more complex state management, Welcome and WhatToExpect are closely related
- **Why not chosen**: Overengineering for the current needs

### Alternative 3: Use a state machine library (XState)

- **Pros**: Explicit state transitions, visual state diagrams
- **Cons**: Additional dependency, learning curve, overkill for linear flow
- **Why not chosen**: Simple useState is sufficient for this flow

## Files Affected

**New Files**:
- `src/components/mobile/BaselineWelcome.tsx` - Welcome screen component

**Modified Files**:
- `src/components/mobile/BaselineAssessmentSDK.tsx` - Removed welcome screen logic
- `src/components/mobile/MobileAppStructure.tsx` - Updated to use both components

**Imports**:
- Components importing baseline assessment need to know about the two-step flow

## Rollback Safety

**This is a relatively safe refactoring to revert.**

**If this decision needs to be reverted:**

1. **Get the original combined component**:
   ```bash
   git log --all --full-history -- "**/BaselineAssessmentSDK.tsx" | head -20
   # Find commit before the split
   git show <commit>:src/components/mobile/BaselineAssessmentSDK.tsx > BaselineAssessmentSDK.backup.tsx
   ```

2. **Restore the monolithic component**:
   - Copy welcome screen JSX from `BaselineWelcome.tsx` back into `BaselineAssessmentSDK.tsx`
   - Add back internal state for screen toggling
   - Remove `onStartAssessment` prop, use internal state instead

3. **Update MobileAppStructure**:
   ```typescript
   case 'baseline_welcome':
     // Change to render BaselineAssessmentSDK directly
     return <BaselineAssessmentSDK onComplete={...} />;
   ```

4. **Delete the separate file**:
   ```bash
   git rm src/components/mobile/BaselineWelcome.tsx
   ```

**Critical checks before reverting:**
- [ ] Verify both welcome screens are present in combined component
- [ ] Test Welcome → What to Expect → Conversation flow
- [ ] Check that back button works
- [ ] Verify all text is correct ("Five questions", not "Six")
- [ ] Update `scripts/check-layout.js` if needed

**Breaking changes introduced:**
- `BaselineWelcome` component created (new export)
- `BaselineAssessmentSDK` no longer shows welcome screens
- `MobileAppStructure` needs to handle two-step flow

## Implementation Notes

**Key patterns to follow:**

1. **BaselineWelcome manages internal transitions:**
   ```typescript
   const [showWelcome, setShowWelcome] = useState(true);
   
   if (showWelcome) {
     return <WelcomeUI onContinue={() => setShowWelcome(false)} />;
   }
   return <WhatToExpectUI onStart={onStartAssessment} />;
   ```

2. **MobileAppStructure handles cross-component navigation:**
   ```typescript
   const [onboardingScreen, setOnboardingScreen] = useState('baseline_welcome');
   
   // baseline_welcome → baseline_assessment
   // baseline_assessment → null (dashboard)
   ```

3. **Each component is self-contained:**
   - BaselineWelcome: Own logo, title, cards
   - BaselineAssessmentSDK: Own header, conversation UI

**Common pitfalls to avoid:**

- ❌ Don't forget to import both components in MobileAppStructure
- ❌ Don't remove the "What to Expect" screen from BaselineAssessmentSDK if it's being used there (check current version)
- ❌ Don't mix the two approaches (internal state + external state)

**Testing requirements:**

- Test Welcome screen renders correctly
- Test "What to Expect" screen appears after Welcome
- Test onStartAssessment callback fires
- Test conversation starts after "What to Expect"
- Test back button returns to welcome flow

**Documentation to update:**

- Component architecture diagram (if one exists)
- Developer onboarding guide
- Testing documentation

## References

- [React Component Composition Patterns](https://reactjs.org/docs/composition-vs-inheritance.html)
- Related: [ADR-001: SDK Migration](./001-elevenlabs-sdk-migration.md) - The SDK split made this refactoring cleaner
- [GitHub issue discussing component size](https://github.com/ColwallKeith/mind-measure-mobile/issues/XXX) _(TODO: Add if exists)_

## Review History

- **2025-11-25**: Implemented during UI refinement sprint
- **2025-12-08**: Documented after rollback revealed interaction with SDK migration
- **2025-12-08**: Verified both components exist and work correctly

