// Quick script to get a Cognito token for API testing
const https = require('https');

const userData = {
  "AuthFlow": "USER_PASSWORD_AUTH",
  "ClientId": "7vu03ppv6alkpphs1ksopll8us",
  "AuthParameters": {
    "USERNAME": "keith@mindmeasure.co.uk",
    "PASSWORD": "Keith50941964!"
  }
};

const options = {
  hostname: 'cognito-idp.eu-west-2.amazonaws.com',
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      const result = JSON.parse(data);
      console.log(result.AuthenticationResult.IdToken);
    } else {
      console.error('Error:', res.statusCode, data);
    }
  });
});

req.write(JSON.stringify(userData));
req.end();
