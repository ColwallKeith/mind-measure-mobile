// API endpoint for initiating AWS Cognito password reset
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';

// AWS Cognito configuration
const cognitoConfig = {
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

const client = new CognitoIdentityProviderClient(cognitoConfig);
const clientId = process.env.AWS_COGNITO_CLIENT_ID || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = (req.body?.email ?? '').toString().trim();
  const email = raw.toLowerCase().replace(/\s/g, '');

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const command = new ForgotPasswordCommand({
      ClientId: clientId,
      Username: email
    });

    const result = await client.send(command);

    // Cognito sends the reset code by email or SMS per User Pool "Account recovery" (separate from
    // sign-up verification). If users get no email: (1) User Pool → Account recovery → set to email.
    // (2) Use SES for Cognito email instead of default. (3) Check spam.
    const delivery = result.CodeDeliveryDetails;

    const codeDeliveryDetails = delivery
      ? { DeliveryMedium: delivery.DeliveryMedium, Destination: delivery.Destination }
      : undefined;

    res.status(200).json({
      codeDeliveryDetails,
      error: null
    });

  } catch (error: any) {
    console.error('Cognito forgot password error:', error);
    
    let errorMessage = 'Failed to initiate password reset';
    let needsVerification = false;
    
    if (error.name === 'UserNotFoundException') {
      errorMessage = 'User not found';
    } else if (error.name === 'InvalidParameterException' && 
               error.message?.includes('no registered/verified email')) {
      errorMessage = 'Email not verified';
      needsVerification = true;
    } else if (error.name === 'LimitExceededException') {
      errorMessage = 'Too many requests. Please try again later.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      needsVerification
    });
  }
}

