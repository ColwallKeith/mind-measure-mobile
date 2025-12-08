# ADR-001: Migrate from @11labs/client to @elevenlabs/react

## Status

**Accepted**

**Date**: 2025-11-20 (Approximate date of migration)

## Context

The Mind Measure mobile application uses ElevenLabs' conversational AI for baseline assessments and check-ins. The original implementation used the `@11labs/client` SDK, which required manual session management and event handling.

**Problems with the old SDK:**
- Required manual `Conversation.startSession()` calls
- Event handlers (`onConnect`, `onMessage`, etc.) needed to be wired manually
- Session management was error-prone
- SDK was deprecated by ElevenLabs
- No React integration - had to manage state manually
- Difficult to handle cleanup and disconnection properly

**Business requirements:**
- Reliable real-time conversation with Jodie (AI agent)
- Clean state management
- Proper React lifecycle integration
- Support for future ElevenLabs features

## Decision

**We will migrate all ElevenLabs integrations to use `@elevenlabs/react` with the `useConversation` hook.**

Key changes:
1. Replace `@11labs/client` dependency with `@elevenlabs/react`
2. Replace manual `Conversation.startSession()` with `useConversation` hook
3. Use React hook patterns for event handling
4. Leverage automatic cleanup and connection management

**Code pattern:**

```typescript
// OLD (❌ Don't use)
import { Conversation } from '@11labs/client';

const conversation = await Conversation.startSession({
  agentId: 'agent_xxx',
  onConnect: () => setConnected(true),
  onMessage: (msg) => setMessages(prev => [...prev, msg])
});

// NEW (✅ Use this)
import { useConversation } from '@elevenlabs/react';

const conversation = useConversation({
  onConnect: () => console.log('Connected'),
  onMessage: (msg) => setMessages(prev => [...prev, msg])
});

// Start session
const sessionId = await conversation.startSession({ 
  agentId: 'agent_xxx' 
});
```

## Consequences

### Positive Consequences

- **Better React integration**: Hooks work naturally with React lifecycle
- **Automatic cleanup**: Hook handles disconnection when component unmounts
- **Simpler code**: Less manual state management
- **Type safety**: Better TypeScript definitions
- **Future-proof**: Active SDK with ongoing support
- **Easier testing**: Hooks can be mocked more easily

### Negative Consequences

- **Breaking change**: Cannot mix old and new SDKs in the same project
- **Migration effort**: All files using old SDK must be updated simultaneously
- **Different API**: Developers familiar with old SDK need to learn new patterns
- **Rollback difficulty**: Cannot easily revert individual files

### Neutral Consequences

- Same functionality, different implementation
- Bundle size remains similar
- No performance impact (positive or negative)

## Alternatives Considered

### Alternative 1: Keep @11labs/client

- **Pros**: No migration needed, developers already familiar
- **Cons**: Deprecated SDK, no React integration, manual state management
- **Why not chosen**: SDK is deprecated and lacks modern React patterns

### Alternative 2: Use raw WebSocket connection

- **Pros**: Maximum control, no third-party dependency changes
- **Cons**: Have to implement entire protocol, no support, high maintenance
- **Why not chosen**: Extremely high engineering cost, reinventing the wheel

### Alternative 3: Wait for ElevenLabs v2 API

- **Pros**: Might have even better features
- **Cons**: Unknown timeline, blocking current development
- **Why not chosen**: Can't wait indefinitely, current SDK is production-ready

## Files Affected

**Primary Files**:
- `src/components/mobile/BaselineAssessmentSDK.tsx` - Main baseline conversation
- `src/components/mobile/CheckinAssessment.tsx` - Check-in conversation
- `package.json` - Dependency change

**Configuration Files**:
- None (no environment variable changes)

**Test Files**:
- Any mocks for ElevenLabs conversations need updating

## Rollback Safety

**⚠️ CRITICAL: This is a breaking change that cannot be partially reverted.**

**If this decision needs to be reverted:**

1. **First**, check if `@11labs/client` is still installed:
   ```bash
   npm list @11labs/client
   ```
   
2. **If not**, reinstall it:
   ```bash
   npm install @11labs/client
   npm uninstall @elevenlabs/react
   ```

3. **For each file** using the new SDK:
   - Find all `import { useConversation } from '@elevenlabs/react'`
   - Replace with `import { Conversation } from '@11labs/client'`
   - Replace hook usage with manual session management
   - Add refs to store conversation instance
   - Manually handle cleanup in useEffect

4. **Verify the rollback**:
   ```bash
   npm run build
   npm run check-layout  # Should fail - update this check!
   ```

**Critical checks before reverting:**
- [ ] Confirm all files have been converted (use grep: `rg "useConversation"`)
- [ ] Test build completes without errors
- [ ] Test conversation starts and messages flow
- [ ] Verify cleanup happens on unmount
- [ ] Update `scripts/check-layout.js` to check for old SDK

**Breaking changes introduced:**
- `Conversation.startSession()` → `conversation.startSession()`
- Event handlers in constructor → Hook parameters
- Manual cleanup → Automatic via hook
- Ref storage → Hook provides conversation object

## Implementation Notes

**Key patterns to follow:**

1. **Always use the hook at component level:**
   ```typescript
   function MyComponent() {
     const conversation = useConversation({ ... });
     // ...
   }
   ```

2. **Store session ID in state:**
   ```typescript
   const [sessionId, setSessionId] = useState<string | null>(null);
   
   const startConversation = async () => {
     const sid = await conversation.startSession({ agentId: 'xxx' });
     setSessionId(sid);
   };
   ```

3. **Always end session on cleanup:**
   ```typescript
   const handleFinish = async () => {
     await conversation.endSession();
   };
   ```

4. **Check conversation status:**
   ```typescript
   if (conversation.status === 'connected') {
     // Show active UI
   }
   ```

**Common pitfalls to avoid:**

- ❌ Don't try to use `Conversation.startSession()` - it doesn't exist in new SDK
- ❌ Don't store conversation in a ref - use the hook's returned object
- ❌ Don't mix old and new SDK imports
- ❌ Don't forget to await `startSession()` and `endSession()`

**Testing requirements:**

- Verify conversation starts successfully
- Check messages are received and displayed
- Confirm session ends cleanly
- Test error handling (network failures, etc.)
- Verify cleanup on component unmount

**Documentation to update:**

- Component README files (if any)
- Onboarding docs for new developers
- `DEVELOPMENT_SAFEGUARDS.md` - reference this ADR

## References

- [ElevenLabs React SDK Documentation](https://elevenlabs.io/docs/developer-guides/conversational-ai/react-sdk)
- [GitHub PR for migration](https://github.com/ColwallKeith/mind-measure-mobile/pull/XXX) _(TODO: Add actual PR)_
- [Old SDK deprecation notice](https://elevenlabs.io/docs/changelog)
- Related: [ADR-002: Baseline Component Split](./002-baseline-component-split.md)

## Review History

- **2025-11-20**: Implemented by development team
- **2025-12-08**: Documented after rollback incident revealed need for ADRs
- **2025-12-08**: Added to `scripts/check-layout.js` verification

