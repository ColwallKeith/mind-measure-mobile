# Mind Measure AWS Lambda Functions

**HIPAA-Compliant Scoring Pipeline for Mental Health Assessment**

## 🎯 Overview

This directory contains AWS Lambda functions that replace the Supabase Edge Functions in the Mind Measure scoring pipeline. These functions provide secure, scalable, and HIPAA-compliant processing of baseline assessment data.

## 🔒 Security Features

- **HIPAA Compliant**: Designed for healthcare data processing with AWS BAA
- **VPC Isolation**: Functions run in private subnets with no internet access
- **Cognito Authentication**: JWT token validation for every request
- **Audit Logging**: Comprehensive CloudWatch and CloudTrail logging
- **Encryption**: All data encrypted in transit and at rest

## 🏗️ Architecture

```
Mobile App → API Gateway (Cognito Auth) → Lambda Functions → RDS Aurora
                ↓
         CloudWatch Logs & CloudTrail
```

## 📋 Functions

### 1. `analyze-text`
**Purpose**: Extracts structured data from baseline conversation transcripts
- Parses PHQ-2 and GAD-2 responses
- Extracts mood scale (1-10) and open responses
- Calculates conversation quality metrics
- Identifies risk flags for safeguarding

### 2. `analyze-audio`
**Purpose**: Processes audio features from conversation recordings
- Analyzes speech rate and pause patterns
- Detects vocal stress indicators
- Measures confidence markers and fluency
- Determines energy and engagement levels

### 3. `analyze-visual`
**Purpose**: Uses AWS Rekognition for emotion detection from video frames
- Processes facial emotions over time
- Calculates emotional stability
- Measures engagement through pose analysis
- Identifies wellbeing indicators

### 4. `calculate-mind-measure`
**Purpose**: Core scoring algorithm that fuses multi-modal data
- Combines text, audio, and visual analysis
- Calculates baseline wellbeing score (0-100)
- Applies quality weighting and uncertainty measures
- Updates user profile and assessment status

## 🚀 Deployment

### Prerequisites

1. **AWS BAA Signed**: Ensure your AWS account has a Business Associate Agreement for HIPAA compliance
2. **VPC Configuration**: Private subnets and security groups configured
3. **Environment Variables**: All required credentials and endpoints configured

### Quick Start

1. **Install Dependencies**:
   ```bash
   cd aws/lambda
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

3. **Deploy to Development**:
   ```bash
   ./deploy.sh
   ```

4. **Deploy to Production**:
   ```bash
   STAGE=prod ./deploy.sh
   ```

### Environment Variables

Create a `.env` file with these required variables:

```bash
# AWS Configuration
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Cognito Configuration  
COGNITO_USER_POOL_ID=eu-west-2_ClAG4fQXR
COGNITO_CLIENT_ID=7vu03ppv6alkpphs1ksopll8us

# RDS Database
RDS_HOST=your-rds-endpoint.eu-west-2.rds.amazonaws.com
RDS_DATABASE=mindmeasure
RDS_USERNAME=your-db-username
RDS_PASSWORD=your-db-password

# VPC Configuration (HIPAA Compliance)
LAMBDA_SECURITY_GROUP_ID=sg-your-security-group-id
LAMBDA_SUBNET_ID_1=subnet-your-private-subnet-1
LAMBDA_SUBNET_ID_2=subnet-your-private-subnet-2
```

## 🔧 Frontend Integration

After deployment, update the frontend `AWSBrowserFunctionsService` with your API Gateway URL:

```typescript
// In src/services/database/AWSBrowserService.ts
this.lambdaBaseUrl = 'https://YOUR-API-GATEWAY-ID.execute-api.eu-west-2.amazonaws.com/prod';
```

The functions will then be called from the baseline assessment:

```typescript
// These calls will now work instead of failing silently
await backendService.functions.invoke('analyze-text', { sessionId, conversationTranscript });
await backendService.functions.invoke('analyze-audio', { sessionId, audioData });
await backendService.functions.invoke('analyze-visual', { sessionId, visualFrames });
await backendService.functions.invoke('calculate-mind-measure', { sessionId });
```

## 📊 Monitoring

### CloudWatch Logs
Each function logs to CloudWatch with structured logging:
- `✅` Success operations
- `⚠️` Warnings and fallbacks  
- `❌` Errors with full context
- `🔍` Debug information

### Key Metrics to Monitor
- **Function Duration**: Should be < 30s for most functions
- **Error Rate**: Should be < 1% in production
- **Memory Usage**: Monitor for optimization opportunities
- **Concurrent Executions**: Ensure within account limits

### Log Groups
- `/aws/lambda/mind-measure-scoring-dev-analyzeText`
- `/aws/lambda/mind-measure-scoring-dev-analyzeAudio`
- `/aws/lambda/mind-measure-scoring-dev-analyzeVisual`
- `/aws/lambda/mind-measure-scoring-dev-calculateMindMeasure`

## 🧪 Testing

### Individual Function Testing
```bash
# Test text analysis
npx serverless invoke -f analyzeText --data '{"sessionId":"test-123","conversationTranscript":"..."}'

# Test scoring calculation
npx serverless invoke -f calculateMindMeasure --data '{"sessionId":"test-123"}'
```

### End-to-End Testing
1. Complete a baseline assessment in the mobile app
2. Check CloudWatch logs for successful function execution
3. Verify data appears in the dashboard
4. Confirm score calculation is accurate

## 🔍 Troubleshooting

### Common Issues

**1. "Unauthorized" Errors**
- Check Cognito JWT token is valid
- Verify API Gateway authorizer configuration
- Ensure token is passed in Authorization header

**2. Database Connection Failures**
- Verify RDS endpoint and credentials
- Check VPC security group allows Lambda access
- Confirm database is running and accessible

**3. Rekognition Errors**
- Ensure IAM role has `rekognition:DetectFaces` permission
- Check image data is valid base64
- Verify AWS region matches Rekognition availability

**4. Timeout Errors**
- Increase Lambda timeout in serverless.yml
- Optimize database queries
- Consider breaking large operations into smaller chunks

### Debug Mode
Set `LOG_LEVEL=debug` in environment variables for verbose logging.

## 💰 Cost Optimization

### Current Estimates (per month)
- **Lambda Invocations**: ~$10-30 (depends on usage)
- **Rekognition**: ~$5-15 (20 frames per assessment)
- **CloudWatch Logs**: ~$2-5
- **API Gateway**: ~$3-10
- **Total**: ~$20-60/month

### Optimization Tips
1. **Limit Rekognition Frames**: Currently capped at 20 frames per assessment
2. **Optimize Memory**: Right-size Lambda memory allocation
3. **Cache Results**: Consider caching for repeated calculations
4. **Batch Processing**: Process multiple assessments together when possible

## 🔐 HIPAA Compliance Checklist

- ✅ **AWS BAA**: Business Associate Agreement signed
- ✅ **VPC Isolation**: Functions run in private subnets
- ✅ **Encryption**: All data encrypted in transit and at rest
- ✅ **Access Control**: Cognito JWT authentication required
- ✅ **Audit Logging**: CloudTrail and CloudWatch logs enabled
- ✅ **Data Minimization**: Only necessary data processed and stored
- ✅ **Secure Transmission**: HTTPS/TLS for all communications
- ✅ **Error Handling**: No PHI in error messages or logs

## 📚 Additional Resources

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [HIPAA on AWS](https://aws.amazon.com/compliance/hipaa-compliance/)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/)
- [AWS Rekognition Developer Guide](https://docs.aws.amazon.com/rekognition/latest/dg/)

## 🆘 Support

For issues with the Lambda functions:
1. Check CloudWatch logs for error details
2. Verify environment configuration
3. Test individual functions in isolation
4. Review HIPAA compliance requirements

**Remember**: These functions process sensitive mental health data. Always follow HIPAA guidelines and your organization's data protection policies.





