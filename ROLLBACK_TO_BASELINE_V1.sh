#!/bin/bash
# EMERGENCY ROLLBACK TO BASELINE MULTIMODAL V1.0
# Run this script if check-in multimodal work breaks the app

set -e

echo "🚨 ROLLING BACK TO BASELINE MULTIMODAL V1.0..."
echo ""

# Confirm
read -p "This will discard uncommitted changes. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Rollback cancelled"
    exit 1
fi

echo "1️⃣ Checking out stable tag..."
git checkout baseline-multimodal-v1.0

echo "2️⃣ Building..."
npm run build

echo "3️⃣ Deploying to Vercel..."
npx vercel --prod --yes > deploy.log 2>&1
DEPLOY_URL=$(grep -o 'https://mind-measure-mobile-final-[^[:space:]]*' deploy.log | head -1)
echo "   Deployed to: $DEPLOY_URL"

echo "4️⃣ Aliasing to production..."
npx vercel alias "$DEPLOY_URL" mobile.mindmeasure.app

echo "5️⃣ Syncing iOS..."
npx cap sync ios

echo ""
echo "✅ ROLLBACK COMPLETE!"
echo "   Live at: https://mobile.mindmeasure.app"
echo ""
echo "To return to main branch:"
echo "   git checkout main"

