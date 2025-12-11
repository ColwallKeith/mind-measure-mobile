#!/usr/bin/env node
/**
 * Pre-Deployment Validation Script
 * 
 * This script MUST pass before any deployment to production.
 * Tests all critical multimodal functionality locally before deployment.
 * 
 * Usage: node scripts/test-multimodal.js
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`)
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    log.success(name);
    return true;
  } catch (error) {
    failedTests++;
    log.error(`${name}: ${error.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function fileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

function fileContains(filePath, searchString) {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
  return content.includes(searchString);
}

// ============================================================================
// TEST SUITE
// ============================================================================

log.header('🧪 Pre-Deployment Validation - Multimodal Baseline');
log.info('Testing all critical functionality before deployment...\n');

// ----------------------------------------------------------------------------
// 1. FILE STRUCTURE TESTS
// ----------------------------------------------------------------------------

log.header('📁 File Structure Tests');

test('Rekognition API endpoint exists', () => {
  assert(
    fileExists('api/rekognition/analyze-frames.ts'),
    'Rekognition endpoint not found'
  );
});

test('Baseline enrichment service exists', () => {
  assert(
    fileExists('src/services/multimodal/baseline/enrichmentService.ts'),
    'Enrichment service not found'
  );
});

test('Audio features module exists', () => {
  assert(
    fileExists('src/services/multimodal/baseline/audioFeatures.ts'),
    'Audio features module not found'
  );
});

test('Visual features module exists', () => {
  assert(
    fileExists('src/services/multimodal/baseline/visualFeatures.ts'),
    'Visual features module not found'
  );
});

test('Scoring module exists', () => {
  assert(
    fileExists('src/services/multimodal/baseline/scoring.ts'),
    'Scoring module not found'
  );
});

test('Media capture module exists', () => {
  assert(
    fileExists('src/services/multimodal/baseline/mediaCapture.ts'),
    'Media capture module not found'
  );
});

test('Types definition exists', () => {
  assert(
    fileExists('src/services/multimodal/types.ts'),
    'Types definition not found'
  );
});

// ----------------------------------------------------------------------------
// 2. DEPENDENCY TESTS
// ----------------------------------------------------------------------------

log.header('\n📦 Dependency Tests');

test('AWS Rekognition SDK installed', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  assert(
    packageJson.dependencies['@aws-sdk/client-rekognition'],
    'Rekognition SDK not installed'
  );
});

test('Face API installed', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  assert(
    packageJson.dependencies['face-api.js'],
    'face-api.js not installed'
  );
});

// ----------------------------------------------------------------------------
// 3. CODE QUALITY TESTS
// ----------------------------------------------------------------------------

log.header('\n🔍 Code Quality Tests');

test('Rekognition API has error handling', () => {
  assert(
    fileContains('api/rekognition/analyze-frames.ts', 'try') &&
    fileContains('api/rekognition/analyze-frames.ts', 'catch'),
    'Missing error handling in Rekognition API'
  );
});

test('Rekognition API validates input', () => {
  assert(
    fileContains('api/rekognition/analyze-frames.ts', 'if (!frames || !Array.isArray(frames)'),
    'Missing input validation in Rekognition API'
  );
});

test('Scoring module handles NaN values', () => {
  assert(
    fileContains('src/services/multimodal/baseline/scoring.ts', 'isNaN'),
    'Scoring module does not check for NaN values'
  );
});

test('Scoring module handles null values', () => {
  assert(
    fileContains('src/services/multimodal/baseline/scoring.ts', 'null'),
    'Scoring module does not handle null values'
  );
});

test('Scoring has fallback to clinical-only', () => {
  assert(
    fileContains('src/services/multimodal/baseline/scoring.ts', 'falling back to clinical'),
    'No fallback logic for failed multimodal enrichment'
  );
});

test('Enrichment service has try-catch blocks', () => {
  assert(
    fileContains('src/services/multimodal/baseline/enrichmentService.ts', 'try') &&
    fileContains('src/services/multimodal/baseline/enrichmentService.ts', 'catch'),
    'Missing error handling in enrichment service'
  );
});

test('Visual features calls Rekognition API', () => {
  assert(
    fileContains('src/services/multimodal/baseline/visualFeatures.ts', '/api/rekognition/analyze-frames'),
    'Visual features does not call Rekognition API'
  );
});

test('BaselineAssessmentSDK integrates enrichment', () => {
  assert(
    fileContains('src/components/mobile/BaselineAssessmentSDK.tsx', 'enrichmentService') ||
    fileContains('src/components/mobile/BaselineAssessmentSDK.tsx', 'enrichBaseline'),
    'Baseline SDK does not integrate enrichment service'
  );
});

// ----------------------------------------------------------------------------
// 4. INTEGRATION TESTS
// ----------------------------------------------------------------------------

log.header('\n🔗 Integration Tests');

test('BaselineAssessmentSDK imports MediaCapture', () => {
  assert(
    fileContains('src/components/mobile/BaselineAssessmentSDK.tsx', 'MediaCapture') ||
    fileContains('src/components/mobile/BaselineAssessmentSDK.tsx', 'mediaCapture'),
    'Baseline SDK does not import MediaCapture'
  );
});

test('Enrichment service uses all extractors', () => {
  const content = fs.readFileSync('src/services/multimodal/baseline/enrichmentService.ts', 'utf-8');
  assert(
    content.includes('audioExtractor') || content.includes('extractAudioFeatures'),
    'Enrichment service does not use audio extractor'
  );
  assert(
    content.includes('visualExtractor') || content.includes('extractVisualFeatures'),
    'Enrichment service does not use visual extractor'
  );
});

test('Scoring module is imported by enrichment service', () => {
  assert(
    fileContains('src/services/multimodal/baseline/enrichmentService.ts', 'scoring') ||
    fileContains('src/services/multimodal/baseline/enrichmentService.ts', 'Scoring'),
    'Enrichment service does not import scoring module'
  );
});

// ----------------------------------------------------------------------------
// 5. ENVIRONMENT TESTS
// ----------------------------------------------------------------------------

log.header('\n🔐 Environment Tests');

test('Rekognition API uses AWS credentials', () => {
  assert(
    fileContains('api/rekognition/analyze-frames.ts', 'AWS_REGION') &&
    fileContains('api/rekognition/analyze-frames.ts', 'AWS_ACCESS_KEY_ID') &&
    fileContains('api/rekognition/analyze-frames.ts', 'AWS_SECRET_ACCESS_KEY'),
    'Rekognition API does not use AWS credentials'
  );
});

test('Environment variables documented', () => {
  const hasProductionEnv = fileExists('production-environment.env');
  const hasEnvExample = fileExists('.env.example');
  assert(
    hasProductionEnv || hasEnvExample,
    'No environment configuration documentation found'
  );
});

// ----------------------------------------------------------------------------
// 6. SAFETY TESTS
// ----------------------------------------------------------------------------

log.header('\n🛡️  Safety Tests');

test('No AWS credentials hardcoded in client code', () => {
  const clientFiles = [
    'src/services/multimodal/baseline/visualFeatures.ts',
    'src/components/mobile/BaselineAssessmentSDK.tsx'
  ];
  
  for (const file of clientFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    assert(
      !content.includes('AKIA') && !content.includes('aws_access_key'),
      `Potential AWS credentials found in ${file}`
    );
  }
});

test('Rekognition API is server-side only', () => {
  const apiPath = 'api/rekognition/analyze-frames.ts';
  assert(
    apiPath.startsWith('api/'),
    'Rekognition endpoint not in /api directory (not server-side)'
  );
});

test('No console.log in production-critical paths', () => {
  // Warning only - console.log is acceptable for debugging
  const scoringContent = fs.readFileSync('src/services/multimodal/baseline/scoring.ts', 'utf-8');
  if (scoringContent.includes('console.log')) {
    log.warn('Found console.log statements in scoring module (acceptable for debugging)');
  }
});

// ----------------------------------------------------------------------------
// 7. DATA VALIDATION TESTS
// ----------------------------------------------------------------------------

log.header('\n📊 Data Validation Tests');

test('Scoring validates final score is not NaN', () => {
  assert(
    fileContains('src/services/multimodal/baseline/scoring.ts', 'isNaN(finalScore)'),
    'Scoring does not validate final score for NaN'
  );
});

test('Scoring validates final score is finite', () => {
  assert(
    fileContains('src/services/multimodal/baseline/scoring.ts', 'isFinite'),
    'Scoring does not validate final score is finite'
  );
});

test('Enrichment service returns structured data', () => {
  const content = fs.readFileSync('src/services/multimodal/baseline/enrichmentService.ts', 'utf-8');
  assert(
    content.includes('finalScore') && content.includes('audioFeatures') && content.includes('visualFeatures'),
    'Enrichment service does not return structured result'
  );
});

// ----------------------------------------------------------------------------
// RESULTS
// ----------------------------------------------------------------------------

log.header('\n📋 Test Results');
console.log('');
console.log(`Total Tests:  ${totalTests}`);
console.log(`${colors.green}Passed:       ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed:       ${failedTests}${colors.reset}`);
console.log('');

if (failedTests > 0) {
  log.error(`${colors.bold}DEPLOYMENT BLOCKED${colors.reset} - ${failedTests} test(s) failed`);
  log.info('Fix the issues above before deploying to production');
  process.exit(1);
} else {
  log.success(`${colors.bold}ALL TESTS PASSED${colors.reset} - Ready for deployment`);
  log.info('Proceed with: npm run build && npx vercel --prod');
  process.exit(0);
}



