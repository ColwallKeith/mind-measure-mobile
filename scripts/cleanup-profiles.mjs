/**
 * Database Cleanup Script - Version 2
 * 
 * Removes all test data for a specific user by email.
 */

const API_BASE = 'https://mobile.mindmeasure.app/api/database';

async function deleteRecords(table, filters) {
  console.log(`🗑️  Deleting from ${table} where:`, filters);
  
  const response = await fetch(`${API_BASE}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, filters })
  });
  
  const result = await response.json();
  
  if (result.error) {
    console.error(`❌ Error deleting from ${table}:`, result.error);
    return false;
  }
  
  console.log(`✅ Deleted from ${table}`);
  return true;
}

async function selectRecords(table, columns, filters) {
  console.log(`🔍 Querying ${table} where:`, filters);
  
  const response = await fetch(`${API_BASE}/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, columns, filters })
  });
  
  const result = await response.json();
  
  if (result.error) {
    console.error(`❌ Error querying ${table}:`, result.error);
    return null;
  }
  
  console.log(`   Found ${result.data ? result.data.length : 0} records`);
  if (result.data && result.data.length > 0) {
    console.log(`   Records:`, JSON.stringify(result.data, null, 2));
  }
  
  return result.data;
}

async function cleanup(email) {
  console.log('\n🧹 Starting database cleanup...\n');
  console.log(`📧 Email: ${email}\n`);
  
  // Step 1: Check profiles by email
  console.log('📊 Checking profile records...\n');
  const profiles = await selectRecords('profiles', ['id', 'email', 'user_id'], { email });
  
  // Step 2: Delete profiles by email
  if (profiles && profiles.length > 0) {
    console.log('\n🗑️  Deleting profile records by email...\n');
    await deleteRecords('profiles', { email });
  }
  
  // Step 3: Verify cleanup
  console.log('\n✅ Cleanup complete! Verifying...\n');
  const remainingProfiles = await selectRecords('profiles', ['id'], { email });
  
  console.log(`   Remaining profiles: ${remainingProfiles ? remainingProfiles.length : 0}\n`);
  
  if (remainingProfiles && remainingProfiles.length > 0) {
    console.log('⚠️  Warning: Some profile records still exist');
  } else {
    console.log('🎉 All profile data cleaned up successfully!');
  }
  
  console.log('\n📝 Note: AWS Cognito user account is NOT deleted - user can still sign in.');
  console.log('   On next sign-in, they will go through baseline flow as a new user.\n');
}

const email = process.argv[2] || 'keith@dicestudio.com';

cleanup(email).catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});


