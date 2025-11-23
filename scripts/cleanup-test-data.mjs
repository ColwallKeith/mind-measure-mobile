/**
 * Database Cleanup Script
 * 
 * Removes all test data for a specific user to allow fresh testing.
 * Run with: node scripts/cleanup-test-data.mjs <user_id>
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
  
  return result.data;
}

async function cleanup(userId) {
  console.log('\n🧹 Starting database cleanup...\n');
  console.log(`👤 User ID: ${userId}\n`);
  
  // Step 1: Check current records
  console.log('📊 Checking current records...\n');
  
  const fusionOutputs = await selectRecords('fusion_outputs', ['id', 'created_at', 'score'], { user_id: userId });
  console.log(`   Found ${fusionOutputs ? fusionOutputs.length : 0} fusion_outputs records`);
  
  const profiles = await selectRecords('profiles', ['id', 'email', 'user_id'], { user_id: userId });
  console.log(`   Found ${profiles ? profiles.length : 0} profile records\n`);
  
  // Step 2: Delete fusion_outputs
  console.log('🗑️  Deleting assessment records...\n');
  await deleteRecords('fusion_outputs', { user_id: userId });
  
  // Step 3: Delete profiles
  console.log('\n🗑️  Deleting profile records...\n');
  await deleteRecords('profiles', { user_id: userId });
  
  // Step 4: Verify cleanup
  console.log('\n✅ Cleanup complete! Verifying...\n');
  
  const remainingFusion = await selectRecords('fusion_outputs', ['id'], { user_id: userId });
  const remainingProfiles = await selectRecords('profiles', ['id'], { user_id: userId });
  
  console.log(`   Remaining fusion_outputs: ${remainingFusion ? remainingFusion.length : 0}`);
  console.log(`   Remaining profiles: ${remainingProfiles ? remainingProfiles.length : 0}\n`);
  
  if ((remainingFusion && remainingFusion.length > 0) || (remainingProfiles && remainingProfiles.length > 0)) {
    console.log('⚠️  Warning: Some records may still exist');
  } else {
    console.log('🎉 All test data cleaned up successfully!');
  }
  
  console.log('\n📝 Note: AWS Cognito user account is NOT deleted - user can still sign in.');
  console.log('   On next sign-in, they will go through baseline flow as a new user.\n');
}

// Get user ID from command line or use default test user
const userId = process.argv[2] || 'a6a26274-c0b1-707a-df6f-1740894f3517';

cleanup(userId).catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});


