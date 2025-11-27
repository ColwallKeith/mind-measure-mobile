// API endpoint for AWS Cognito sign up
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CognitoIdentityProviderClient,
  SignUpCommand
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

  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const userAttributes: Array<{ Name: string; Value: string }> = [
      {
        Name: 'email',
        Value: email
      }
    ];
    
    if (firstName) {
      userAttributes.push({ Name: 'given_name', Value: firstName });
    }
    
    if (lastName) {
      userAttributes.push({ Name: 'family_name', Value: lastName });
    }

    const command = new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: userAttributes
    });

    const result = await client.send(command);

    res.status(200).json({
      userSub: result.UserSub,
      userConfirmed: result.UserConfirmed,
      codeDeliveryDetails: result.CodeDeliveryDetails,
      error: null
    });

  } catch (error: any) {
    console.error('Cognito sign up error:', error);
    
    let errorMessage = 'Sign up failed';
    if (error.name === 'InvalidPasswordException') {
      errorMessage = 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers';
    } else if (error.name === 'UsernameExistsException') {
      errorMessage = 'An account with this email already exists';
    } else if (error.name === 'InvalidParameterException') {
      errorMessage = 'Invalid email format';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(400).json({ error: errorMessage });
  }
}
