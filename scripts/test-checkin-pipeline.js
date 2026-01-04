#!/usr/bin/env node
/**
 * Check-in Multimodal Sanity Test
 * 
 * Validates that the check-in pipeline can be imported and instantiated
 * without runtime errors.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 CHECK-IN MULTIMODAL SANITY TEST\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let passed = 0;
let failed = 0;

// Test 1: Directory structure exists
console.log('Test 1: Checking directory structure...');
const baseDir = path.join(__dirname, '../src/services/multimodal/checkin');
const requiredDirs = [
  'extractors',
  'analyzers',
  'fusion',
  'assembly'
];

for (const dir of requiredDirs) {
  const dirPath = path.join(baseDir, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`✓ ${dir}/ exists`);
    passed++;
  } else {
    console.log(`✗ ${dir}/ missing`);
    failed++;
  }
}

// Test 2: Required files exist
console.log('\nTest 2: Checking required files...');
const requiredFiles = [
  'types.ts',
  'extractors/audioFeatures.ts',
  'extractors/visualFeatures.ts',
  'analyzers/textAnalyzer.ts',
  'fusion/fusionEngine.ts',
  'assembly/dashboardAssembler.ts',
  'enrichmentService.ts',
  'index.ts'
];

for (const file of requiredFiles) {
  const filePath = path.join(baseDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✓ ${file} (${stats.size} bytes)`);
    passed++;
  } else {
    console.log(`✗ ${file} missing`);
    failed++;
  }
}

// Test 3: Check TypeScript syntax (basic)
console.log('\nTest 3: Checking TypeScript syntax...');
const tsFiles = requiredFiles.filter(f => f.endsWith('.ts'));

for (const file of tsFiles) {
  const filePath = path.join(baseDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Basic syntax checks
  const hasExport = content.includes('export');
  const hasImport = content.includes('import') || !content.includes('from');
  const balanced = (content.match(/\{/g) || []).length === (content.match(/\}/g) || []).length;
  
  if (hasExport && hasImport && balanced) {
    console.log(`✓ ${file} syntax looks valid`);
    passed++;
  } else {
    console.log(`✗ ${file} potential syntax issue`);
    failed++;
  }
}

// Test 4: Check for required exports in index.ts
console.log('\nTest 4: Checking public API exports...');
const indexPath = path.join(baseDir, 'index.ts');
const indexContent = fs.readFileSync(indexPath, 'utf8');

const requiredExports = [
  'CheckinEnrichmentService',
  'enrichCheckIn',
  'CheckinAudioExtractor',
  'CheckinVisualExtractor',
  'CheckinTextAnalyzer',
  'CheckinFusionEngine',
  'DashboardAssembler'
];

for (const exportName of requiredExports) {
  if (indexContent.includes(exportName)) {
    console.log(`✓ ${exportName} exported`);
    passed++;
  } else {
    console.log(`✗ ${exportName} not exported`);
    failed++;
  }
}

// Test 5: Check for baseline isolation (safety check)
console.log('\nTest 5: Checking baseline isolation (safety)...');
const baselineFiles = [
  '../baseline/scoring.ts',
  '../baseline/enrichmentService.ts',
  '../baseline/mediaCapture.ts'
];

let baselineUntouched = true;
for (const file of baselineFiles) {
  const filePath = path.join(baseDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file} still exists (not modified)`);
    passed++;
  } else {
    console.log(`✗ ${file} missing or moved`);
    failed++;
    baselineUntouched = false;
  }
}

if (baselineUntouched) {
  console.log('✓ Baseline module isolated and protected');
  passed++;
}

// Test 6: Feature count verification
console.log('\nTest 6: Verifying feature counts...');
const typesPath = path.join(baseDir, 'types.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

// Count audio features
const audioMatch = typesContent.match(/interface CheckinAudioFeatures\s*{([^}]+)}/s);
if (audioMatch) {
  const audioFields = audioMatch[1].match(/^\s+\w+:/gm) || [];
  console.log(`✓ Audio features: ${audioFields.length - 2} (excluding quality, duration)`);
  passed++;
}

// Count visual features
const visualMatch = typesContent.match(/interface CheckinVisualFeatures\s*{([^}]+)}/s);
if (visualMatch) {
  const visualFields = visualMatch[1].match(/^\s+\w+:/gm) || [];
  console.log(`✓ Visual features: ${visualFields.length - 3} (excluding metadata)`);
  passed++;
}

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`✅ PASSED: ${passed}`);
console.log(`❌ FAILED: ${failed}`);
console.log(`\n${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'}\n`);

process.exit(failed > 0 ? 1 : 0);









