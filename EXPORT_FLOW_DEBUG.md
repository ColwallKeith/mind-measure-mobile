# Export Flow Debug Instructions

## Current Issue
The baseline completion is NOT calling `handleBaselineComplete` - none of the expected logs appear in console.

## To Test Properly:

### Option A: Test on Web (Recommended)
1. Open **Chrome/Safari** on desktop
2. Go to `https://mobile.mindmeasure.app`
3. Open **DevTools Console** (Cmd+Option+J on Mac)
4. Log in as Keith
5. Go to Profile → Wellness
6. Click "Export My Data"
7. **Watch for this log:** `🔄 Starting baseline from export flow`
8. If you see it → continue with baseline
9. If you DON'T see it → the button handler is broken

### Option B: Test on iOS with Fresh Build
1. In Xcode, **Product → Clean Build Folder**
2. Run the app fresh
3. Same steps as above
4. iOS console logs go to Xcode debug console

## Expected Log Sequence:

```
// When you click "Start Baseline Assessment":
🔄 Starting baseline from export flow - setting return context to export_data
🔄 baselineReturnContext updated to: export_data

// When baseline completes:
✅ Baseline complete - marking on device
🔍 Current baselineReturnContext (ref): export_data
📊 Baseline completed from export flow - returning to profile with auto-export
🎯 Rendering profile - shouldAutoExport: true
```

## If Logs Don't Appear:

**Problem 1:** Button not calling callback
- The `onNavigateToBaseline` prop is not connected

**Problem 2:** Baseline not calling onComplete
- BaselineAssessmentSDK is not calling the completion handler

**Problem 3:** iOS using old cached code
- Need to force refresh the web assets

## Quick Check:
Look for this EXACT log when you click the button:
```
🔄 Starting baseline from export flow - setting return context to export_data
```

If you DON'T see this, the problem is BEFORE the baseline even starts!
