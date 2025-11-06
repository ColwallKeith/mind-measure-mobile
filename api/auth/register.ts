import { VercelRequest, VercelResponse } from '@vercel/node';
import { BackendServiceFactory } from '../../src/services/database/BackendServiceFactory';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, firstName, lastName' 
      });
    }

    // Initialize AWS backend service
    const backendService = BackendServiceFactory.createService(
      BackendServiceFactory.getEnvironmentConfig()
    );

    // Register user with AWS Cognito
    const { user, error } = await backendService.auth.signUp({
      email,
      password,
      firstName,
      lastName
    });

    if (error) {
      console.error('Registration error:', error);
      return res.status(400).json({ error });
    }

    if (!user) {
      return res.status(400).json({ error: 'Registration failed - no user returned' });
    }

    // Create user profile in Aurora database
    try {
      const { error: profileError } = await backendService.database.insert('profiles', {
        user_id: user.id,
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (profileError) {
        console.warn('Profile creation failed:', profileError);
        // Don't fail registration if profile creation fails
      }
    } catch (profileError) {
      console.warn('Profile creation error:', profileError);
    }

    // Return success response
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified || false
      },
      message: 'Registration successful. Please check your email for verification.'
    });

  } catch (error: any) {
    console.error('Registration API error:', error);
    res.status(500).json({ 
      error: 'Internal server error during registration',
      details: error.message 
    });
  }
}

