# Configuration Validation Script

## Purpose
Prevents deployment issues by validating configuration before builds and deployments.

## What It Checks

### ✅ Environment Variables
- AWS Cognito configuration
- Backend provider settings
- Deprecated variables (Supabase, API_BASE_URL)

### ✅ Capacitor Configuration
- No server.url for iOS (prevents remote loading)
- Correct app ID and webDir
- Local build usage

### ✅ Vercel Configuration
- No functions config in mobile-final
- Correct SPA rewrite rules

### ✅ Dependencies
- Required AWS SDK packages
- Capacitor framework
- Deprecated Supabase packages

### ✅ Build Output
- Dist directory exists
- JavaScript and CSS assets present
- Index.html generated

### ✅ iOS Setup
- Workspace exists
- Assets synced properly

### ✅ API Health
- Production endpoints responding
- Database connectivity

## Usage

### Manual Validation
```bash
npm run validate
```

### Integrated with Build
```bash
npm run build:mobile  # Includes validation
npm run deploy        # Includes validation
```

## Exit Codes
- **0**: All validations passed
- **1**: Validation failed (errors found)

## Common Issues Caught

### ❌ Capacitor Remote Loading
```typescript
// BAD - causes authentication issues
server: {
  url: 'https://mobile.mindmeasure.app'
}

// GOOD - uses local build
// No server config
```

### ❌ Missing Environment Variables
```bash
# Required for AWS integration
export VITE_AWS_REGION=eu-west-2
export VITE_AWS_COGNITO_USER_POOL_ID=eu-west-2_ClAG4fQXR
export VITE_AWS_COGNITO_CLIENT_ID=7vu03ppv6alkpphs1ksopll8us
export VITE_BACKEND_PROVIDER=aurora-serverless
```

### ❌ Deprecated Dependencies
- `@supabase/supabase-js` (use AWS instead)
- `VITE_API_BASE_URL` (use Lambda functions)

## Integration with Development Protocol

This script enforces the rules from `DEVELOPMENT_PROTOCOL.md`:

1. **No localhost development**
2. **Production = Development environment**
3. **iOS uses local builds, not remote**
4. **AWS Cognito for authentication**
5. **Lambda functions for database**

## Preventing Configuration Drift

Run validation:
- ✅ Before every deployment
- ✅ After repository migrations
- ✅ When switching between repos
- ✅ After major configuration changes

## Extending the Validator

To add new checks:

```javascript
// Add to ConfigValidator class
validateNewFeature() {
  console.log('\n🔍 Validating New Feature...');
  
  if (/* condition */) {
    this.success('Feature configured correctly');
  } else {
    this.error('Feature misconfigured');
  }
}

// Add to validate() method
async validate() {
  // ... existing validations
  this.validateNewFeature();
  // ... rest of method
}
```

## Why This Matters

**Before this script**: Configuration issues discovered during deployment or iOS testing, causing delays and frustration.

**After this script**: Issues caught immediately, preventing:
- Authentication failures
- Remote loading instead of local builds
- Missing dependencies
- Deployment failures
- iOS-specific problems

**Result**: Faster, more reliable development cycle with fewer surprises.

