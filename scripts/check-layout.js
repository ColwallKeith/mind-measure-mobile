#!/usr/bin/env node

/**
 * Critical Layout Verification Script
 * 
 * Prevents commits that would break critical UI elements or mix incompatible SDKs.
 * Run automatically via pre-commit hook or manually with: node scripts/check-layout.js
 */

const fs = require('fs');
const path = require('path');

// Define critical strings that MUST exist in specific files
const CRITICAL_CHECKS = [
  {
    file: 'src/components/mobile/BaselineWelcome.tsx',
    mustContain: [
      { text: 'Welcome to Mind Measure!', reason: 'First welcome screen must be present' },
      { text: 'BaselineAssessmentScreen', reason: 'Must export BaselineAssessmentScreen component' }
    ]
  },
  {
    file: 'src/components/mobile/BaselineAssessmentSDK.tsx',
    mustContain: [
      { text: 'Five questions from Jodie', reason: 'What to expect screen must say "Five" not "Six"' },
      { text: '3-5 minutes max', reason: 'Correct duration displayed' }
    ]
  },
  {
    file: 'src/components/mobile/BaselineAssessmentSDK.tsx',
    mustContain: [
      { text: '@elevenlabs/react', reason: 'Must use modern @elevenlabs/react SDK' },
      { text: 'useConversation', reason: 'Must use useConversation hook (not old Conversation class)' }
    ],
    mustNotContain: [
      { text: '@11labs/client', reason: 'Old SDK is incompatible with current code' },
      { text: 'Conversation.startSession', reason: 'Old API pattern - use useConversation hook instead' }
    ]
  },
  {
    file: 'src/components/mobile/MobileAppStructure.tsx',
    mustContain: [
      { text: 'BaselineAssessmentSDK', reason: 'Must import SDK version not widget' },
      { text: 'onRetakeBaseline', reason: 'Dashboard needs onRetakeBaseline prop' }
    ]
  },
  {
    file: 'src/components/mobile/MobileDashboard.tsx',
    mustContain: [
      { text: 'onRetakeBaseline', reason: 'Dashboard must accept onRetakeBaseline prop' }
    ]
  },
  {
    file: 'package.json',
    mustContain: [
      { text: '@elevenlabs/react', reason: 'Modern ElevenLabs SDK required' }
    ],
    mustNotContain: [
      { text: '@11labs/client', reason: 'Old SDK must not coexist with new SDK' }
    ]
  }
];

let totalChecks = 0;
let failedChecks = 0;
const errors = [];

console.log('🔍 Running critical layout verification...\n');

// Run all checks
for (const check of CRITICAL_CHECKS) {
  const filePath = path.join(__dirname, '..', check.file);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    failedChecks++;
    errors.push({
      severity: 'ERROR',
      file: check.file,
      message: 'FILE MISSING',
      reason: 'Critical file does not exist'
    });
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check required strings
  if (check.mustContain) {
    for (const requirement of check.mustContain) {
      totalChecks++;
      if (!content.includes(requirement.text)) {
        failedChecks++;
        errors.push({
          severity: 'ERROR',
          file: check.file,
          message: `MISSING REQUIRED: "${requirement.text}"`,
          reason: requirement.reason
        });
      }
    }
  }
  
  // Check forbidden strings
  if (check.mustNotContain) {
    for (const forbidden of check.mustNotContain) {
      totalChecks++;
      if (content.includes(forbidden.text)) {
        failedChecks++;
        errors.push({
          severity: 'ERROR',
          file: check.file,
          message: `FORBIDDEN STRING FOUND: "${forbidden.text}"`,
          reason: forbidden.reason
        });
      }
    }
  }
}

// Report results
console.log(`Ran ${totalChecks} checks across ${CRITICAL_CHECKS.length} files\n`);

if (errors.length > 0) {
  console.error('❌ CRITICAL LAYOUT ERRORS DETECTED:\n');
  
  for (const error of errors) {
    console.error(`${error.severity}: ${error.file}`);
    console.error(`  ${error.message}`);
    console.error(`  Reason: ${error.reason}\n`);
  }
  
  console.error('💥 Verification failed!');
  console.error(`   ${failedChecks}/${totalChecks} checks failed\n`);
  console.error('   Fix the errors above before committing.\n');
  
  process.exit(1);
} else {
  console.log('✅ All critical layout checks passed!');
  console.log(`   ${totalChecks}/${totalChecks} checks successful\n`);
  process.exit(0);
}

