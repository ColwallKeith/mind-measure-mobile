#!/bin/bash

echo "🔑 Setting up NEW AWS credentials for Mind Measure..."
echo ""

# Check if user provided credentials
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Usage: ./setup-new-aws-credentials.sh YOUR_ACCESS_KEY_ID YOUR_SECRET_ACCESS_KEY"
    echo ""
    echo "Example:"
    echo "./setup-new-aws-credentials.sh AKIAEXAMPLE123456789 wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    exit 1
fi

ACCESS_KEY_ID="$1"
SECRET_ACCESS_KEY="$2"

echo "🏠 Step 1: Setting up local environment file..."
cat > .env.local << ENVEOF
VITE_AWS_ACCESS_KEY_ID=${ACCESS_KEY_ID}
VITE_AWS_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}
ENVEOF
echo "✅ Local .env.local created"

echo ""
echo "☁️ Step 2: Updating Vercel environment variables..."

# Update Vercel production environment variables
echo "${ACCESS_KEY_ID}" | npx vercel env add VITE_AWS_ACCESS_KEY_ID production --force
echo "${SECRET_ACCESS_KEY}" | npx vercel env add VITE_AWS_SECRET_ACCESS_KEY production --force

# Also set the standard AWS environment variables for Lambda functions
echo "${ACCESS_KEY_ID}" | npx vercel env add AWS_ACCESS_KEY_ID production --force
echo "${SECRET_ACCESS_KEY}" | npx vercel env add AWS_SECRET_ACCESS_KEY production --force

echo "✅ Vercel environment variables updated"

echo ""
echo "🔧 Step 3: Setting required AWS configuration..."

# Set other required AWS environment variables
echo "eu-west-2" | npx vercel env add AWS_REGION production --force
echo "eu-west-2_ClAG4fQXR" | npx vercel env add VITE_AWS_COGNITO_USER_POOL_ID production --force
echo "7vu03ppv6alkpphs1ksopll8us" | npx vercel env add VITE_AWS_COGNITO_CLIENT_ID production --force
echo "mindmeasure-user-content-459338929203" | npx vercel env add AWS_S3_BUCKET_NAME production --force

echo "✅ AWS configuration set"

echo ""
echo "🚀 Step 4: Building and deploying with new credentials..."

# Build the project
npm run build

# Deploy to Vercel
npx vercel --prod

# Set the domain alias
npx vercel alias mobile.mindmeasure.app

echo ""
echo "🎉 Setup complete! New AWS credentials are now active."
echo ""
echo "🧪 Next steps:"
echo "1. Test the app: https://mobile.mindmeasure.app"
echo "2. Try user registration to verify Cognito works"
echo "3. Run: npx cap sync ios && npx cap run ios"
echo ""
echo "🔍 If you see any errors, check the browser console for authentication issues."
