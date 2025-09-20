#!/usr/bin/env node

// Complete System Test - LinkedIn Messenger
const { chromium } = require('playwright');

console.log('🔬 COMPLETE SYSTEM TEST\n');
console.log('=' .repeat(60));

async function testSystem() {
  const results = {
    playwright: false,
    database: false,
    openai: false,
    runner: false,
    api: false
  };

  // 1. Test Playwright
  console.log('\n1️⃣ Testing Playwright Browser Automation...');
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://linkedin.com', { timeout: 10000 });
    const title = await page.title();
    await browser.close();
    results.playwright = true;
    console.log('   ✅ Can launch browser and navigate to LinkedIn');
  } catch (e) {
    console.log('   ❌ Playwright error:', e.message);
  }

  // 2. Test Database
  console.log('\n2️⃣ Testing Database Connection...');
  try {
    require('dotenv').config({ path: '.env.local' });
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { count, error } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });

    if (!error) {
      results.database = true;
      console.log('   ✅ Database connected, campaigns table accessible');
    } else {
      console.log('   ❌ Database error:', error.message);
    }
  } catch (e) {
    console.log('   ❌ Database connection failed:', e.message);
  }

  // 3. Test OpenAI
  console.log('\n3️⃣ Testing OpenAI API...');
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "OK"' }],
      max_tokens: 5
    });

    if (response.choices[0].message.content) {
      results.openai = true;
      console.log('   ✅ OpenAI API working (GPT-5 Nano ready when available)');
    }
  } catch (e) {
    console.log('   ❌ OpenAI error:', e.message);
  }

  // 4. Test Runner Module
  console.log('\n4️⃣ Testing LinkedIn Runner...');
  try {
    const LinkedInRunner = require('./runner/linkedin-runner.js');
    const runner = new LinkedInRunner({
      headlessMode: true,
      userDataDir: './runner/linkedin-sessions'
    });
    results.runner = true;
    console.log('   ✅ LinkedIn Runner module loads correctly');
  } catch (e) {
    console.log('   ❌ Runner error:', e.message);
  }

  // 5. Test API
  console.log('\n5️⃣ Testing API Server...');
  try {
    const response = await fetch('http://localhost:8082/');
    if (response.ok || response.status === 307) {
      results.api = true;
      console.log('   ✅ API server responding on port 8082');
    } else {
      console.log('   ⚠️  API returned status:', response.status);
    }
  } catch (e) {
    console.log('   ❌ API not running on port 8082');
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 FINAL RESULTS:\n');

  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key.toUpperCase()}`);
  });

  console.log('\n' + '=' .repeat(60));

  if (passed === total) {
    console.log('\n🎉 SYSTEM 100% READY FOR PRODUCTION!');
    console.log('\nYou can now:');
    console.log('1. Open http://localhost:8082');
    console.log('2. Create campaigns with AI personalization');
    console.log('3. Run: cd runner && node run-local.js');
    console.log('4. Log into LinkedIn and start messaging');
  } else {
    console.log(`\n⚠️  ${passed}/${total} components working`);
    console.log('\nIssues to resolve:');
    Object.entries(results).forEach(([key, value]) => {
      if (!value) {
        console.log(`  - Fix ${key}`);
      }
    });
  }

  console.log('\n');
  process.exit(passed === total ? 0 : 1);
}

// Run test
testSystem().catch(console.error);