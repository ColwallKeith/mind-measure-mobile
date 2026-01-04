/**
 * Clear Test Users Script
 * 
 * This script removes test users from:
 * 1. AWS Cognito (auth)
 * 2. Aurora PostgreSQL database (user profiles, assessments)
 * 
 * WARNING: This is for development only!
 */

import { CognitoIdentityProviderClient, ListUsersCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const AWS_REGION = 'eu-west-2';
const USER_POOL_ID = 'eu-west-2_ClAG4fQXR';

async function clearCognitoUsers() {
  const client = new CognitoIdentityProviderClient({ 
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  });

  console.log('🔍 Listing all users in Cognito...');
  
  try {
    const listCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60
    });
    
    const response = await client.send(listCommand);
    const users = response.Users || [];
    
    console.log(`📋 Found ${users.length} users in Cognito`);
    
    for (const user of users) {
      const username = user.Username;
      const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value;
      
      console.log(`\n🗑️  Deleting user: ${email} (${username})`);
      
      try {
        const deleteCommand = new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username
        });
        
        await client.send(deleteCommand);
        console.log(`✅ Deleted: ${email}`);
      } catch (error) {
        console.error(`❌ Failed to delete ${email}:`, error);
      }
    }
    
    console.log('\n✅ Cognito cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error listing/deleting Cognito users:', error);
  }
}

async function clearDatabaseUsers() {
  console.log('\n🗄️  Clearing database users...');
  
  const API_BASE = 'https://mobile.mindmeasure.app/api/database';
  
  try {
    // Delete all assessment responses
    console.log('🗑️  Deleting assessment responses...');
    const responsesRes = await fetch(`${API_BASE}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'assessment_responses',
        condition: { id: { $ne: null } } // Delete all
      })
    });
    const responsesData = await responsesRes.json();
    console.log(`✅ Deleted ${responsesData.data?.count || 0} assessment responses`);
    
    // Delete all user profiles
    console.log('🗑️  Deleting user profiles...');
    const profilesRes = await fetch(`${API_BASE}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'user_profiles',
        condition: { id: { $ne: null } } // Delete all
      })
    });
    const profilesData = await profilesRes.json();
    console.log(`✅ Deleted ${profilesData.data?.count || 0} user profiles`);
    
    console.log('\n✅ Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  }
}

async function main() {
  console.log('🧹 CLEARING ALL TEST USERS');
  console.log('================================\n');
  
  // Clear Cognito
  await clearCognitoUsers();
  
  // Clear Database
  await clearDatabaseUsers();
  
  console.log('\n✨ All cleanup complete! Database is fresh.');
}

main().catch(console.error);


