#!/usr/bin/env node

// Check current database schema

const { Client } = require('pg');

const dbConfig = {
  host: process.env.VITE_DB_HOST || 'mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com',
  port: parseInt(process.env.VITE_DB_PORT || '5432'),
  database: process.env.VITE_DB_NAME || 'mindmeasure',
  user: process.env.VITE_DB_USERNAME || 'mindmeasure_admin',
  password: process.env.VITE_DB_PASSWORD || 'MindMeasure2024!',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

async function checkSchema() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    
    // Check what tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📊 Existing tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check fusion_outputs columns
    const fusionColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'fusion_outputs' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 fusion_outputs columns:');
    fusionColumnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check assessment_sessions columns
    const assessmentColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'assessment_sessions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 assessment_sessions columns:');
    assessmentColumnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  } finally {
    await client.end();
  }
}

checkSchema();
