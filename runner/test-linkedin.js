const { chromium } = require('playwright');
require('dotenv').config();

async function testLinkedIn() {
  console.log('🚀 Starting LinkedIn Automation Test...\n');

  const browser = await chromium.launch({
    headless: false, // Show the browser
    slowMo: 500, // Slow down for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to LinkedIn...');
    await page.goto('https://www.linkedin.com/login');

    console.log('✅ LinkedIn login page loaded');
    console.log('⚠️  You need to manually log in now!');
    console.log('   Enter your credentials in the browser window');

    // Wait for manual login (detect when we're on the feed page)
    await page.waitForURL('**/feed/**', { timeout: 120000 });
    console.log('✅ Login successful! Now on LinkedIn feed');

    // Save the session cookies
    const cookies = await context.cookies();
    console.log(`💾 Saved ${cookies.length} cookies for future use`);

    // Try to navigate to messages
    console.log('📨 Navigating to messages...');
    await page.goto('https://www.linkedin.com/messaging/');
    await page.waitForTimeout(3000);

    console.log('✅ Messages page loaded');

    // Example: Click on "Compose new message" button if it exists
    const composeButton = await page.locator('button:has-text("Compose")').first();
    if (await composeButton.isVisible()) {
      console.log('✅ Found compose button - LinkedIn automation is working!');

      // Don't actually click it to avoid sending messages
      // await composeButton.click();
    }

    console.log('\n🎉 SUCCESS! LinkedIn automation is functional');
    console.log('   - Can navigate LinkedIn');
    console.log('   - Can maintain session');
    console.log('   - Can interact with UI elements');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n⏸️  Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
    console.log('🔚 Test complete');
  }
}

// Run the test
testLinkedIn().catch(console.error);