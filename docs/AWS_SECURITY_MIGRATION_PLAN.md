# AWS Security Migration Plan

## 🚨 Critical Security Issue

**Problem**: AWS Cognito credentials (User Pool ID, Client ID) are currently exposed in client-side JavaScript bundles deployed to Vercel and accessible in browser DevTools.

**Risk**: Anyone can inspect the deployed code and see these credentials, potentially allowing unauthorized account creation or abuse of AWS services.

**Solution**: Move ALL AWS authentication calls to server-side Vercel API endpoints. Client never directly communicates with AWS.

---

## Current Architecture (INSECURE)

```
Browser/Mobile App
    ↓ (exposed AWS credentials in JS)
AWS Cognito (direct)
AWS API Gateway (direct)
Aurora Serverless v2
```

**Problems:**
- `VITE_AWS_COGNITO_USER_POOL_ID` exposed in compiled JS
- `VITE_AWS_COGNITO_CLIENT_ID` exposed in compiled JS
- `VITE_AWS_REGION` exposed in compiled JS
- Anyone can create accounts in your user pool
- AWS security scanning flags this as credential exposure

---

## Target Architecture (SECURE)

```
Browser/Mobile App (NO AWS credentials)
    ↓ (calls /api/auth/* endpoints)
Vercel Serverless Functions (server-side only AWS credentials)
    ↓
AWS Cognito
AWS API Gateway
Aurora Serverless v2
```

**Benefits:**
- Zero AWS credentials in client-side code
- All authentication requests authenticated and rate-limited server-side
- Can add additional security checks (captcha, rate limiting, etc.)
- AWS security alerts resolved
- Production-ready security architecture

---

## Migration Steps

### Phase 1: Enhance Server-Side Auth Endpoints ✅ (Already Exist!)

**Status**: You already have these files in `/api/auth/`:
- ✅ `signin.ts` - Sign in with email/password
- ✅ `signup.ts` - Register new user
- ✅ `confirm.ts` - Confirm email verification code
- ⚠️ Need to enhance for complete Amplify API compatibility

**What needs to be added:**
1. `resend-confirmation.ts` - Resend verification code
2. `reset-password.ts` - Initiate forgot password
3. `confirm-reset-password.ts` - Confirm password reset
4. `get-user.ts` - Get current authenticated user
5. `refresh-token.ts` - Refresh JWT tokens
6. `signout.ts` - Sign out user

**All endpoints will:**
- Use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from Vercel environment variables (server-side only)
- Return JWT tokens to client
- Never expose AWS credentials to browser

---

### Phase 2: Create Client-Side Proxy Service

**New file**: `src/services/cognito-api-client.ts`

This will be a drop-in replacement for `amplify-auth.ts` that calls your Vercel API endpoints instead of AWS directly:

```typescript
// Instead of:
import { signIn } from 'aws-amplify/auth';

// We'll have:
export const cognitoApiClient = {
  async signIn(email: string, password: string) {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },
  // ... all other methods
};
```

**Benefits:**
- Same interface as Amplify
- Zero AWS SDK imports in client
- All calls go through your secure API

---

### Phase 3: Update AuthContext

**File**: `src/contexts/AuthContext.tsx`

Replace all `amplifyAuth.*` calls with `cognitoApiClient.*` calls:

```typescript
// BEFORE:
import { amplifyAuth } from '@/services/amplify-auth';
const result = await amplifyAuth.signIn(email, password);

// AFTER:
import { cognitoApiClient } from '@/services/cognito-api-client';
const result = await cognitoApiClient.signIn(email, password);
```

**Token Storage:**
- JWT tokens returned from API endpoints stored in Capacitor Preferences (client-side)
- Tokens sent with subsequent API requests via Authorization header
- No AWS SDK or Amplify needed on client

---

### Phase 4: Remove Client-Side AWS Dependencies

**Remove from `package.json`:**
```json
"aws-amplify": "^6.0.0",
"@aws-amplify/core": "^6.0.0",
"@aws-sdk/client-cognito-identity-provider": "^3.x.x"
```

**Remove files:**
- `src/services/amplify-auth.ts` (replaced by `cognito-api-client.ts`)
- Any other direct AWS SDK imports

**Remove environment variables from client:**
```bash
# These should ONLY exist in Vercel (server-side):
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
# AWS_COGNITO_USER_POOL_ID
# AWS_COGNITO_CLIENT_ID
# AWS_REGION

# These can be REMOVED from .env (no longer needed in client):
# VITE_AWS_COGNITO_USER_POOL_ID  ❌ DELETE
# VITE_AWS_COGNITO_CLIENT_ID     ❌ DELETE  
# VITE_AWS_REGION                ❌ DELETE
```

---

### Phase 5: Update Vercel Environment Variables

**In Vercel Dashboard** → Settings → Environment Variables:

**Keep these (server-side only, NOT prefixed with VITE_):**
```
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_COGNITO_USER_POOL_ID=eu-west-2_ClAG4fQXR
AWS_COGNITO_CLIENT_ID=7vu03ppv6alkpphs1ksopll8us
AWS_REGION=eu-west-2
```

**Remove these (no longer needed in client build):**
```
VITE_AWS_COGNITO_USER_POOL_ID  ❌ DELETE
VITE_AWS_COGNITO_CLIENT_ID     ❌ DELETE
VITE_AWS_REGION                ❌ DELETE
```

---

## Implementation Order

### Step 1: Create Missing Auth API Endpoints (1-2 hours)
- Create `api/auth/resend-confirmation.ts`
- Create `api/auth/reset-password.ts`
- Create `api/auth/confirm-reset-password.ts`
- Create `api/auth/get-user.ts`
- Create `api/auth/refresh-token.ts`
- Enhance existing endpoints for full compatibility

### Step 2: Create Client Proxy Service (1 hour)
- Create `src/services/cognito-api-client.ts`
- Implement all auth methods to call API endpoints
- Add JWT token management (store in Capacitor Preferences)

### Step 3: Update AuthContext (30 minutes)
- Replace `amplifyAuth` with `cognitoApiClient`
- Test all auth flows

### Step 4: Remove AWS Dependencies (30 minutes)
- Remove AWS packages from package.json
- Remove amplify-auth.ts
- Remove VITE_ prefixed env vars from .env

### Step 5: Deploy & Verify (30 minutes)
- Deploy to Vercel
- Test all auth flows
- Verify no AWS credentials in compiled JS
- Confirm AWS security alerts resolved

**Total estimated time: 4-5 hours**

---

## Testing Checklist

After migration, verify:

- [ ] Registration works (new user signup)
- [ ] Email verification works
- [ ] Sign in works (existing user)
- [ ] Sign out works
- [ ] Forgot password flow works
- [ ] Token refresh works (session persistence)
- [ ] No AWS credentials visible in browser DevTools
- [ ] No AWS credentials in compiled JS files (check `dist/assets/index-*.js`)
- [ ] AWS security alerts cleared

---

## Rollback Plan

If issues occur:
1. Revert to previous git commit
2. Re-add VITE_ environment variables to Vercel
3. Redeploy previous version

Git commit before migration:
```bash
git tag pre-aws-security-migration
git push --tags
```

---

## Security Benefits

**Before Migration:**
- ❌ AWS credentials exposed in browser
- ❌ Anyone can create accounts
- ❌ No rate limiting on auth attempts
- ❌ AWS security alerts

**After Migration:**
- ✅ Zero AWS credentials in client code
- ✅ Server-side authentication control
- ✅ Can add rate limiting, captcha, etc.
- ✅ Production-ready security
- ✅ AWS security alerts resolved

---

## Next Steps

**Option A - Implement Now:**
I can implement this migration immediately following the steps above.

**Option B - Schedule for Later:**
Document accepted, schedule implementation when ready.

**Your current AWS alert will persist until this migration is complete.**

---

**Document Version**: 1.0  
**Created**: November 27, 2025  
**Priority**: HIGH - Security Issue  
**Estimated Time**: 4-5 hours  
**Risk Level**: LOW (rollback available)

