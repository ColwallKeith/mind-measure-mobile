import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID?.trim() || '',
      userPoolClientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID?.trim() || '',
      region: import.meta.env.VITE_AWS_REGION?.trim() || 'eu-west-2',
    }
  }
});

console.log('🔧 AWS Amplify configured with:', {
  userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID?.trim(),
  clientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID?.trim(),
  region: import.meta.env.VITE_AWS_REGION?.trim()
});
