// Test Aurora Migration: Content Distribution
// Purpose: Run migration and verify schema changes

const { Client } = require('pg');

const client = new Client({
  host: process.env.AWS_AURORA_HOST || 'mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com',
  port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
  database: process.env.AWS_AURORA_DATABASE || 'mindmeasure',
  user: process.env.AWS_AURORA_USERNAME || 'mindmeasure_admin',
  password: process.env.AWS_AURORA_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to Aurora\n');
    
    console.log('📝 Running migration...');
    const migration = require('fs').readFileSync('./migrations/006_content_distribution.sql', 'utf8');
    await client.query(migration);
    console.log('✅ Migration completed\n');
    
    // Verify schema
    console.log('🔍 Verifying schema changes:');
    const result = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'content_articles'
      AND column_name IN ('source', 'source_article_id', 'university_id', 'status')
      ORDER BY ordinal_position
    `);
    
    console.table(result.rows);
    
    // Test insert with new columns
    console.log('\n🧪 Testing insert with new columns...');
    const testInsert = await client.query(`
      SELECT id FROM universities LIMIT 1
    `);
    
    if (testInsert.rows.length > 0) {
      const testUniId = testInsert.rows[0].id;
      console.log(`   Using test university ID: ${testUniId}`);
      
      const insertResult = await client.query(`
        INSERT INTO content_articles (
          university_id,
          title,
          excerpt,
          content,
          status,
          source,
          source_article_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, source, source_article_id
      `, [
        testUniId,
        'TEST: Imported Article',
        'This is a test imported article',
        'Full content here',
        'draft',
        'imported',
        '123e4567-e89b-12d3-a456-426614174000'
      ]);
      
      console.log('✅ Test insert successful:');
      console.log(insertResult.rows[0]);
      
      // Clean up test
      await client.query(`DELETE FROM content_articles WHERE id = $1`, [insertResult.rows[0].id]);
      console.log('🧹 Test record cleaned up');
    }
    
    console.log('\n✅ Phase 1 Complete: Database setup successful!');
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

runMigration();
