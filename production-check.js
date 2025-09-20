#!/usr/bin/env node

// Production Readiness Checker - Comprehensive audit for LinkedIn Messenger
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 LinkedIn Messenger Production Readiness Check\n');
console.log('=' .repeat(60));

let issues = [];
let warnings = [];
let successes = [];

// 1. Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

  if (majorVersion >= 18) {
    successes.push(`✅ Node.js ${nodeVersion} (18+ required)`);
  } else {
    issues.push(`❌ Node.js ${nodeVersion} too old (need 18+)`);
  }
}

// 2. Check environment variables
function checkEnvironmentVars() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY'
  ];

  const missing = [];

  // Check .env.local first
  const envPath = path.join(__dirname, '.env.local');
  let envVars = {};

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key] = line.split('=');
        if (key) envVars[key.trim()] = true;
      }
    });
  }

  // Check process env as fallback
  required.forEach(key => {
    if (!envVars[key] && !process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length === 0) {
    successes.push('✅ All required environment variables configured');
  } else {
    issues.push(`❌ Missing environment variables:\n   ${missing.join('\n   ')}`);
  }
}

// 3. Check dependencies
function checkDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const critical = [
      '@supabase/supabase-js',
      'openai',
      'next',
      'react',
      'playwright'
    ];

    const missing = critical.filter(dep =>
      !packageJson.dependencies?.[dep] &&
      !packageJson.devDependencies?.[dep]
    );

    if (missing.length === 0) {
      successes.push('✅ All critical dependencies installed');
    } else {
      issues.push(`❌ Missing dependencies: ${missing.join(', ')}`);
    }
  } catch (e) {
    issues.push('❌ Could not read package.json');
  }
}

// 4. Check Playwright browsers
function checkPlaywrightBrowsers() {
  try {
    const browserPath = path.join(
      require('os').homedir(),
      'Library/Caches/ms-playwright'
    );

    if (fs.existsSync(browserPath)) {
      const browsers = fs.readdirSync(browserPath);
      const hasChromium = browsers.some(b => b.includes('chromium'));

      if (hasChromium) {
        successes.push('✅ Playwright Chromium browser installed');
      } else {
        warnings.push('⚠️  Chromium browser may need installation: npx playwright install chromium');
      }
    } else {
      issues.push('❌ Playwright browsers not installed. Run: npx playwright install');
    }
  } catch (e) {
    warnings.push('⚠️  Could not verify Playwright browsers');
  }
}

// 5. Check required directories
function checkDirectories() {
  const dirs = [
    'runner/linkedin-sessions',
    'runner/screenshots',
    'runner/logs',
    'logs'
  ];

  const missing = dirs.filter(dir => !fs.existsSync(dir));

  if (missing.length === 0) {
    successes.push('✅ All required directories exist');
  } else {
    warnings.push(`⚠️  Creating missing directories: ${missing.join(', ')}`);
    missing.forEach(dir => {
      fs.mkdirSync(dir, { recursive: true });
    });
  }
}

// 6. Check database connection
async function checkDatabase() {
  try {
    const { createClient } = require('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      warnings.push('⚠️  Cannot test database - missing credentials');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { count, error } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });

    if (!error) {
      successes.push('✅ Database connection verified');
    } else {
      issues.push(`❌ Database error: ${error.message}`);
    }
  } catch (e) {
    warnings.push('⚠️  Could not verify database connection');
  }
}

// 7. Check runner functionality
function checkRunner() {
  const runnerPath = path.join(__dirname, 'runner/index-production.js');
  const linkedinRunnerPath = path.join(__dirname, 'runner/linkedin-runner.js');

  if (!fs.existsSync(runnerPath)) {
    issues.push('❌ Production runner not found');
  } else if (!fs.existsSync(linkedinRunnerPath)) {
    issues.push('❌ LinkedIn runner not found');
  } else {
    successes.push('✅ Runner scripts present');
  }
}

// 8. Check API endpoints
async function checkAPIs() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      successes.push('✅ API server running on port 3000');
    } else {
      warnings.push('⚠️  API server not responding on port 3000');
    }
  } catch {
    warnings.push('⚠️  API server not running. Start with: npm run dev');
  }
}

// 9. Check PM2 configuration
function checkPM2() {
  if (fs.existsSync('ecosystem.config.js')) {
    successes.push('✅ PM2 configuration found');

    try {
      execSync('npx pm2 --version', { stdio: 'ignore' });
      successes.push('✅ PM2 installed');
    } catch {
      warnings.push('⚠️  PM2 not installed. Install with: npm install -g pm2');
    }
  } else {
    issues.push('❌ PM2 ecosystem.config.js missing');
  }
}

// 10. Check AI configuration
function checkAIConfig() {
  if (process.env.OPENAI_API_KEY || fs.existsSync('.env.local')) {
    successes.push('✅ OpenAI API key configured');
  } else {
    issues.push('❌ OpenAI API key not configured');
  }
}

// Main execution
async function main() {
  console.log('\n📋 Running checks...\n');

  checkNodeVersion();
  checkEnvironmentVars();
  checkDependencies();
  checkPlaywrightBrowsers();
  checkDirectories();
  checkRunner();
  checkPM2();
  checkAIConfig();

  await checkDatabase();
  await checkAPIs();

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESULTS:\n');

  if (successes.length > 0) {
    console.log('✅ Passed Checks:');
    successes.forEach(s => console.log('  ' + s));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log('  ' + w));
  }

  if (issues.length > 0) {
    console.log('\n❌ Critical Issues:');
    issues.forEach(i => console.log('  ' + i));
  }

  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (issues.length === 0) {
    console.log('\n✅ SYSTEM READY FOR PRODUCTION!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Start the app: npm run dev');
    console.log('  2. Navigate to: http://localhost:3000');
    console.log('  3. Create a campaign and import connections');
    console.log('  4. Log into LinkedIn via Runner when prompted');
    console.log('  5. Launch campaign and monitor progress');
  } else {
    console.log('\n❌ CRITICAL ISSUES MUST BE RESOLVED');
    console.log('\n📝 Required Actions:');
    console.log('  1. Copy .env.production.example to .env.local');
    console.log('  2. Fill in all required environment variables');
    console.log('  3. Run: npm install --legacy-peer-deps');
    console.log('  4. Run: npx playwright install chromium');
    console.log('  5. Run this check again: node production-check.js');
  }

  console.log('\n');
}

// Run the checker
main().catch(console.error);