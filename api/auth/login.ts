import { VercelRequest, VercelResponse } from '@vercel/node';
import { BackendServiceFactory } from '../../src/services/database/BackendServiceFactory';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password' 
      });
    }

    // Initialize AWS backend service
    const backendService = BackendServiceFactory.createService(
      BackendServiceFactory.getEnvironmentConfig()
    );

    // Authenticate user with AWS Cognito
    const { user, error } = await backendService.auth.signIn({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Get user profile from Aurora database
    let profile = null;
    try {
      const { data: profiles, error: profileError } = await backendService.database.select('profiles', {
        filters: { user_id: { operator: 'eq', value: user.id } },
        columns: '*'
      });

      if (!profileError && profiles && profiles.length > 0) {
        profile = profiles[0];
      }
    } catch (profileError) {
      console.warn('Profile fetch error:', profileError);
    }

    // Check baseline completion status
    let hasCompletedBaseline = false;
    try {
      const { data: sessions, error: sessionError } = await backendService.database.select('assessment_sessions', {
        filters: { 
          user_id: { operator: 'eq', value: user.id },
          assessment_type: { operator: 'eq', value: 'baseline' },
          status: { operator: 'eq', value: 'completed' }
        },
        columns: 'id',
        limit: 1
      });

      if (!sessionError && sessions && sessions.length > 0) {
        hasCompletedBaseline = true;
      }
    } catch (sessionError) {
      console.warn('Baseline check error:', sessionError);
    }

    // Return success response
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified || false,
        profile,
        hasCompletedBaseline,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken
      },
      message: 'Login successful'
    });

  } catch (error: any) {
    console.error('Login API error:', error);
    res.status(500).json({ 
      error: 'Internal server error during login',
      details: error.message 
    });
  }
}

