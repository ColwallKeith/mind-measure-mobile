#!/usr/bin/env node
/**
 * Mind Measure Configuration Validator
 * 
 * Prevents deployment issues by validating:
 * - Environment variables
 * - Capacitor configuration
 * - Vercel configuration
 * - Package dependencies
 * - Authentication setup
 * 
 * Run before ANY deployment: node validate-config.js
 */

const fs = require('fs');
const path = require('path');

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = 0;
  }

  error(message) {
    this.errors.push(`❌ ERROR: ${message}`);
  }

  warning(message) {
    this.warnings.push(`⚠️  WARNING: ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
    this.checks++;
  }

  // Check if file exists
  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  // Read and parse JSON file safely
  readJSON(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      this.error(`Failed to read ${filePath}: ${error.message}`);
      return null;
    }
  }

  // Read TypeScript config file
  readTSConfig(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Basic extraction for CapacitorConfig - not full TS parsing
      return content;
    } catch (error) {
      this.error(`Failed to read ${filePath}: ${error.message}`);
      return null;
    }
  }

  // Validate environment variables
  validateEnvironment() {
    console.log('\n🔧 Validating Environment Configuration...');
    
    const requiredEnvVars = [
      'VITE_AWS_REGION',
      'VITE_AWS_COGNITO_USER_POOL_ID', 
      'VITE_AWS_COGNITO_CLIENT_ID',
      'VITE_BACKEND_PROVIDER'
    ];

    const packageJson = this.readJSON('package.json');
    if (!packageJson) return;

    // Check if env vars are documented in package.json scripts or README
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        this.success(`Environment variable ${envVar} is set`);
      } else {
        this.warning(`Environment variable ${envVar} not set in current shell`);
      }
    });

    // Validate specific values
    if (process.env.VITE_AWS_REGION !== 'eu-west-2') {
      this.error('VITE_AWS_REGION must be "eu-west-2" per development protocol');
    }

    if (process.env.VITE_AWS_COGNITO_USER_POOL_ID !== 'eu-west-2_ClAG4fQXR') {
      this.error('VITE_AWS_COGNITO_USER_POOL_ID must be "eu-west-2_ClAG4fQXR" per development protocol');
    }

    if (process.env.VITE_BACKEND_PROVIDER !== 'aurora-serverless') {
      this.error('VITE_BACKEND_PROVIDER must be "aurora-serverless" per development protocol');
    }

    // Check for deprecated environment variables
    if (process.env.VITE_API_BASE_URL) {
      this.error('VITE_API_BASE_URL should NOT be set - mobile app uses Lambda functions directly');
    }

    if (process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_ANON_KEY) {
      this.warning('Supabase environment variables detected - ensure AWS migration is complete');
    }
  }

  // Validate Capacitor configuration
  validateCapacitor() {
    console.log('\n📱 Validating Capacitor Configuration...');

    if (!this.fileExists('capacitor.config.ts')) {
      this.error('capacitor.config.ts not found');
      return;
    }

    const configContent = this.readTSConfig('capacitor.config.ts');
    if (!configContent) return;

    // Check for problematic server.url configuration
    if (configContent.includes('server:') && configContent.includes('url:')) {
      if (configContent.includes('mobile.mindmeasure.app') || configContent.includes('localhost')) {
        this.error('Capacitor config contains server.url - iOS should use local build, not remote loading');
      }
    } else {
      this.success('Capacitor config correctly uses local build (no server.url)');
    }

    // Check app ID
    if (configContent.includes('com.mindmeasure.mobile')) {
      this.success('Capacitor app ID is correct: com.mindmeasure.mobile');
    } else {
      this.error('Capacitor app ID should be "com.mindmeasure.mobile"');
    }

    // Check webDir
    if (configContent.includes("webDir: 'dist'")) {
      this.success('Capacitor webDir correctly set to "dist"');
    } else {
      this.error('Capacitor webDir should be "dist"');
    }
  }

  // Validate Vercel configuration
  validateVercel() {
    console.log('\n🚀 Validating Vercel Configuration...');

    if (!this.fileExists('vercel.json')) {
      this.warning('vercel.json not found - using Vercel defaults');
      return;
    }

    const vercelConfig = this.readJSON('vercel.json');
    if (!vercelConfig) return;

    // Check for functions configuration (should not exist for mobile-final)
    if (vercelConfig.functions) {
      this.error('vercel.json should NOT contain functions config in mobile-final repo');
    } else {
      this.success('Vercel config correctly excludes functions (mobile-final is frontend only)');
    }

    // Check rewrites for SPA
    if (vercelConfig.rewrites && vercelConfig.rewrites.length > 0) {
      const spaRewrite = vercelConfig.rewrites.find(r => 
        r.destination === '/index.html' && r.source.includes('(?!api')
      );
      if (spaRewrite) {
        this.success('Vercel config has correct SPA rewrite rules');
      } else {
        this.warning('Vercel rewrites may not be optimized for SPA routing');
      }
    }
  }

  // Validate package dependencies
  validateDependencies() {
    console.log('\n📦 Validating Package Dependencies...');

    const packageJson = this.readJSON('package.json');
    if (!packageJson) return;

    const requiredDeps = {
      'aws-amplify': 'AWS authentication',
      '@aws-sdk/client-lambda': 'Lambda function calls',
      '@capacitor/core': 'Capacitor framework',
      '@capacitor/ios': 'iOS platform support',
      'react': 'React framework',
      'vite': 'Build tool'
    };

    Object.entries(requiredDeps).forEach(([dep, purpose]) => {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        this.success(`${dep} installed (${purpose})`);
      } else {
        this.error(`Missing dependency: ${dep} (needed for ${purpose})`);
      }
    });

    // Check for deprecated dependencies
    const deprecatedDeps = {
      '@supabase/supabase-js': 'Should use AWS services instead',
      'supabase': 'Should use AWS services instead'
    };

    Object.entries(deprecatedDeps).forEach(([dep, reason]) => {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        this.warning(`Deprecated dependency ${dep}: ${reason}`);
      }
    });
  }

  // Validate build output
  validateBuild() {
    console.log('\n🏗️  Validating Build Output...');

    if (!this.fileExists('dist')) {
      this.error('dist/ directory not found - run "npm run build" first');
      return;
    }

    if (!this.fileExists('dist/index.html')) {
      this.error('dist/index.html not found - build may have failed');
      return;
    }

    this.success('Build output exists (dist/index.html found)');

    // Check for essential assets (in dist/assets/)
    const assetsPath = 'dist/assets';
    if (this.fileExists(assetsPath)) {
      const assetFiles = fs.readdirSync(assetsPath);
      const hasJS = assetFiles.some(f => f.endsWith('.js'));
      const hasCSS = assetFiles.some(f => f.endsWith('.css'));
      
      if (hasJS) {
        this.success('JavaScript assets found in build');
      } else {
        this.error('No JavaScript files found in dist/assets/ - build incomplete');
      }

      if (hasCSS) {
        this.success('CSS assets found in build');
      } else {
        this.warning('No CSS files found in dist/assets/ - styles may be missing');
      }
    } else {
      // Fallback: check dist root
      const distFiles = fs.readdirSync('dist');
      const hasJS = distFiles.some(f => f.endsWith('.js'));
      const hasCSS = distFiles.some(f => f.endsWith('.css'));

      if (hasJS) {
        this.success('JavaScript assets found in build');
      } else {
        this.error('No JavaScript files found in dist/ - build incomplete');
      }

      if (hasCSS) {
        this.success('CSS assets found in build');
      } else {
        this.warning('No CSS files found in dist/ - styles may be missing');
      }
    }
  }

  // Validate iOS setup
  validateiOS() {
    console.log('\n🍎 Validating iOS Configuration...');

    if (!this.fileExists('ios')) {
      this.warning('ios/ directory not found - run "npx cap add ios" if needed');
      return;
    }

    if (!this.fileExists('ios/App/App.xcworkspace')) {
      this.error('iOS workspace not found - Capacitor iOS setup incomplete');
      return;
    }

    this.success('iOS workspace exists');

    // Check if iOS build assets are synced
    if (this.fileExists('ios/App/App/public/index.html')) {
      this.success('iOS assets synced (public/index.html exists)');
    } else {
      this.error('iOS assets not synced - run "npx cap sync ios"');
    }
  }

  // Validate API endpoints
  async validateAPI() {
    console.log('\n🌐 Validating API Endpoints...');

    try {
      // Test health endpoint
      const response = await fetch('https://mobile.mindmeasure.app/api/database/health');
      if (response.ok) {
        this.success('API health endpoint responding');
      } else {
        this.error(`API health endpoint returned ${response.status}`);
      }
    } catch (error) {
      this.error(`Cannot reach API health endpoint: ${error.message}`);
    }
  }

  // Run all validations
  async validate() {
    console.log('🔍 Mind Measure Configuration Validator');
    console.log('=====================================');

    this.validateEnvironment();
    this.validateCapacitor();
    this.validateVercel();
    this.validateDependencies();
    this.validateBuild();
    this.validateiOS();
    await this.validateAPI();

    // Print summary
    console.log('\n📊 Validation Summary');
    console.log('====================');
    console.log(`✅ Successful checks: ${this.checks}`);
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(warning));
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach(error => console.log(error));
      console.log('\n🚨 VALIDATION FAILED - Fix errors before deployment!');
      process.exit(1);
    } else {
      console.log('\n🎉 All validations passed! Ready for deployment.');
      process.exit(0);
    }
  }
}

// Run validation
const validator = new ConfigValidator();
validator.validate().catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
