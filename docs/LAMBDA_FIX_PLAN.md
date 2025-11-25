# Lambda Functions Fix - Action Plan

## Current Status: ❌ All Lambda calls failing with `TypeError: Load failed`

### Root Causes Identified:

1. **Lambda functions may not be deployed to production** (`prod` stage)
   - Current URL: `https://l58pu5wb07.execute-api.eu-west-2.amazonaws.com/prod`
   - Functions might only be deployed to `dev` stage

2. **VPC Configuration may be blocking API Gateway access**
   - Lambda functions are in VPC for HIPAA compliance
   - But API Gateway needs to be able to invoke them
   - NAT Gateway may not be configured

3. **CORS Preflight Failures**
   - Mobile app (`mobile.mindmeasure.app`) making requests to API Gateway
   - Preflight `OPTIONS` requests may be failing
   - Authorization header in CORS config may need adjustment

## Immediate Diagnostic Steps:

### Step 1: Check Lambda Deployment Status
```bash
cd /Users/keithduddy/Desktop/Mind\ Measure\ local/mind-measure-mobile-final/aws/lambda

# Check if functions are deployed
npx serverless info --stage prod
```

**Expected Output:**
- List of deployed functions
- API Gateway endpoint URLs
- If ERROR: Functions not deployed

### Step 2: Test Lambda Endpoints Directly
```bash
# Test if API Gateway is reachable (without auth first)
curl -X OPTIONS https://l58pu5wb07.execute-api.eu-west-2.amazonaws.com/prod/analyze-text \
  -H "Origin: https://mobile.mindmeasure.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -v

# Expected: 200 OK with CORS headers
# If 403/404: Functions not deployed or CORS misconfigured
```

### Step 3: Test with Valid Cognito Token
```typescript
// In mobile app console at mobile.mindmeasure.app
const { fetchAuthSession } = await import('aws-amplify/auth');
const session = await fetchAuthSession();
const token = session.tokens.accessToken.toString();

// Test analyze-text endpoint
const response = await fetch('https://l58pu5wb07.execute-api.eu-west-2.amazonaws.com/prod/analyze-text', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    sessionId: 'test-123',
    conversationTranscript: 'Test transcript'
  })
});

console.log('Status:', response.status);
console.log('Response:', await response.text());
```

## Solution Options:

### Option 1: Deploy Lambda Functions (If Not Deployed)

**IF** `serverless info --stage prod` shows no functions:

```bash
cd /Users/keithduddy/Desktop/Mind\ Measure\ local/mind-measure-mobile-final/aws/lambda

# Create .env file if it doesn't exist
cp env.example .env

# Add required variables (you'll need to provide these):
# AWS_REGION=eu-west-2
# COGNITO_USER_POOL_ID=eu-west-2_ClAG4fQXR
# COGNITO_CLIENT_ID=7vu03ppv6alkpphs1ksopll8us
# RDS_HOST=mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com
# RDS_DATABASE=mindmeasure
# RDS_USERNAME=mindmeasure_admin
# RDS_PASSWORD=<your-rds-password>

# Deploy to prod
STAGE=prod ./deploy.sh
```

### Option 2: Fix VPC Configuration (If Functions Deployed but Unreachable)

**IF** functions are deployed but still getting "Load failed":

The issue is likely that Lambda functions in VPC can't connect to API Gateway. Two solutions:

**A) Remove VPC Configuration (Quick Fix - Less Secure)**
```yaml
# In serverless.yml, comment out VPC config
provider:
  # vpc:
  #   securityGroupIds:
  #     - sg-0fb35bb5df4944901
  #   subnetIds:
  #     - subnet-0f353d9954cfaa8b8
  #     - subnet-076f01549b5d991f6
```

**B) Add NAT Gateway (Proper Fix - HIPAA Compliant)**
- Create NAT Gateway in public subnet
- Update route tables for private subnets to route through NAT
- Cost: ~$30/month

### Option 3: Fix CORS Configuration

**IF** getting CORS errors in browser console:

Update `serverless.yml`:
```yaml
cors:
  origin: 
    - https://mobile.mindmeasure.app
    - http://localhost:5173  # For local dev
  headers:
    - Content-Type
    - Authorization
    - X-Amz-Date
    - X-Api-Key
    - X-Amz-Security-Token
  allowCredentials: false
```

### Option 4: Temporary Bypass - Use Vercel Serverless Functions

**IF** Lambda deployment is too complex right now:

We can deploy the scoring logic to Vercel serverless functions as a temporary measure:

```bash
# Create API routes in mobile app
mkdir -p /Users/keithduddy/Desktop/Mind\ Measure\ local/mind-measure-mobile-final/api/lambda

# Copy Lambda code to Vercel serverless functions
# Vercel functions don't need VPC, CORS is simpler
```

## Recommended Immediate Action:

**I recommend Option 1 first** - Check if functions are deployed:

1. Run `npx serverless info --stage prod` to see deployment status
2. If not deployed, deploy them
3. If deployed, test with `curl` to diagnose CORS/VPC issues

**Can you run this command and share the output?**
```bash
cd /Users/keithduddy/Desktop/Mind\ Measure\ local/mind-measure-mobile-final/aws/lambda && npx serverless info --stage prod
```

This will tell us exactly what state the Lambda functions are in.


