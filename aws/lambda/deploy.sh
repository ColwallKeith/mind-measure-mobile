#!/bin/bash

# Mind Measure Lambda Functions Deployment Script
# HIPAA-compliant deployment for AWS Lambda scoring pipeline

set -e  # Exit on any error

echo "🚀 Mind Measure Lambda Deployment Starting..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "serverless.yml" ]; then
    echo "❌ Error: serverless.yml not found. Please run this script from the aws/lambda directory."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Please copy env.example to .env and configure your settings."
    echo "📋 Required environment variables:"
    echo "   - AWS credentials and region"
    echo "   - Cognito User Pool ID and Client ID"  
    echo "   - RDS database connection details"
    echo "   - VPC configuration for HIPAA compliance"
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=(
    "AWS_REGION"
    "COGNITO_USER_POOL_ID" 
    "COGNITO_CLIENT_ID"
    "RDS_HOST"
    "RDS_DATABASE"
    "RDS_USERNAME"
    "RDS_PASSWORD"
)

echo "🔍 Validating environment variables..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set"
        exit 1
    fi
done
echo "✅ Environment variables validated"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Deploy based on stage
STAGE=${STAGE:-dev}
echo "🚀 Deploying to stage: $STAGE"

if [ "$STAGE" = "prod" ]; then
    echo "⚠️  PRODUCTION DEPLOYMENT"
    echo "   This will deploy HIPAA-compliant Lambda functions to production."
    echo "   Make sure you have:"
    echo "   - ✅ AWS BAA signed"
    echo "   - ✅ VPC configured for isolation"
    echo "   - ✅ Security groups properly configured"
    echo "   - ✅ All environment variables validated"
    echo ""
    read -p "Continue with production deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Production deployment cancelled"
        exit 1
    fi
fi

# Run serverless deploy
echo "🚀 Deploying Lambda functions..."
npx serverless deploy --stage $STAGE --verbose

# Get the API Gateway URL from deployment output
echo ""
echo "📋 Deployment Summary:"
echo "======================"
echo "Stage: $STAGE"
echo "Region: $AWS_REGION"
echo "Functions deployed:"
echo "  - analyze-text"
echo "  - analyze-audio" 
echo "  - analyze-visual"
echo "  - calculate-mind-measure"
echo ""

# Show next steps
echo "🎯 Next Steps:"
echo "=============="
echo "1. Update frontend AWSBrowserFunctionsService with the API Gateway URL"
echo "2. Test each Lambda function individually"
echo "3. Run end-to-end baseline assessment test"
echo "4. Monitor CloudWatch logs for any issues"
echo ""

if [ "$STAGE" = "prod" ]; then
    echo "🔒 HIPAA Compliance Checklist:"
    echo "=============================="
    echo "□ AWS BAA signed and active"
    echo "□ Lambda functions deployed in VPC"
    echo "□ CloudTrail logging enabled"
    echo "□ Security groups restrict access"
    echo "□ All data encrypted in transit and at rest"
    echo "□ Access tokens properly validated"
    echo ""
fi

echo "✅ Deployment completed successfully!"
echo "🔗 Don't forget to update the Lambda API Gateway URL in your frontend code."





