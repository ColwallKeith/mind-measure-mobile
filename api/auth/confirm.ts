import { VercelRequest, VercelResponse } from '@vercel/node';
import { Amplify } from 'aws-amplify';
import { confirmSignUp } from 'aws-amplify/auth';

// Configure Amplify with environment variables
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.VITE_AWS_COGNITO_USER_POOL_ID?.trim() || '',
      userPoolClientId: process.env.VITE_AWS_COGNITO_CLIENT_ID?.trim() || '',
      region: process.env.VITE_AWS_REGION?.trim() || 'eu-west-2',
    }
  }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code, redirect } = req.query;
  
  if (!email || !code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mind Measure - Email Confirmation Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                   margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
                        text-align: center; max-width: 400px; }
            .error { color: #e53e3e; margin-bottom: 20px; }
            .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #667eea, #764ba2); 
                   border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; 
                   justify-content: center; color: white; font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">MM</div>
            <h1>Email Confirmation Error</h1>
            <p class="error">Missing email or confirmation code in the link.</p>
            <p>Please try clicking the confirmation link in your email again, or contact support if the problem persists.</p>
          </div>
        </body>
      </html>
    `);
  }
  
  try {
    console.log('📧 Confirming email via API:', email);
    
    // Confirm with Cognito
    const { isSignUpComplete } = await confirmSignUp({
      username: email as string,
      confirmationCode: code as string
    });
    
    if (!isSignUpComplete) {
      throw new Error('Email confirmation incomplete');
    }
    
    console.log('✅ Email confirmed successfully via API');
    
    // Success - redirect to app or show success page
    const redirectUrl = redirect as string;
    
    if (redirectUrl && redirectUrl.startsWith('mindmeasure://')) {
      // Mobile app redirect
      return res.redirect(302, redirectUrl);
    } else {
      // Web success page
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mind Measure - Email Confirmed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                     margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                     min-height: 100vh; display: flex; align-items: center; justify-content: center; }
              .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
                          text-align: center; max-width: 400px; }
              .success { color: #38a169; margin-bottom: 20px; }
              .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #38a169, #48bb78); 
                     border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; 
                     justify-content: center; color: white; font-size: 24px; font-weight: bold; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); 
                       color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; 
                       margin-top: 20px; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">✓</div>
              <h1>Email Confirmed!</h1>
              <p class="success">Your email has been successfully confirmed.</p>
              <p>You can now return to the Mind Measure app to continue your wellness journey.</p>
              <a href="mindmeasure://confirmed" class="button">Open Mind Measure App</a>
            </div>
            <script>
              // Auto-redirect to app after 3 seconds if on mobile
              setTimeout(() => {
                if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                  window.location.href = 'mindmeasure://confirmed';
                }
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }
    
  } catch (error: any) {
    console.error('❌ Email confirmation failed:', error);
    
    let errorMessage = 'Email confirmation failed';
    if (error.name === 'CodeMismatchException') {
      errorMessage = 'Invalid confirmation code. The code may have expired or been used already.';
    } else if (error.name === 'ExpiredCodeException') {
      errorMessage = 'Confirmation code has expired. Please request a new one.';
    } else if (error.name === 'UserNotFoundException') {
      errorMessage = 'User not found. Please check the email address.';
    }
    
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mind Measure - Email Confirmation Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                   margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
                        text-align: center; max-width: 400px; }
            .error { color: #e53e3e; margin-bottom: 20px; }
            .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #e53e3e, #fc8181); 
                   border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; 
                   justify-content: center; color: white; font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">!</div>
            <h1>Email Confirmation Failed</h1>
            <p class="error">${errorMessage}</p>
            <p>Please try again or contact support if the problem persists.</p>
          </div>
        </body>
      </html>
    `);
  }
}
