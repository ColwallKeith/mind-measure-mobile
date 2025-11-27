// API endpoint for AWS Cognito sign up
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CognitoIdentityProviderClient,
  SignUpCommand
} from '@aws-sdk/client-cognito-identity-provider';

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
    // Get environment variables and trim whitespace/newlines
    const region = (process.env.AWS_REGION || 'eu-west-2').trim();
    const clientId = process.env.AWS_COGNITO_CLIENT_ID?.trim();
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

    console.log('🔧 Signup - Region:', region);
    console.log('🔧 Signup - Client ID exists:', !!clientId);
    console.log('🔧 Signup - Credentials exist:', !!accessKeyId && !!secretAccessKey);

    if (!clientId || !accessKeyId || !secretAccessKey) {
      console.error('❌ Missing required environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create Cognito client inside handler
    const client = new CognitoIdentityProviderClient({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });

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
    console.error('❌ Cognito sign up error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
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
