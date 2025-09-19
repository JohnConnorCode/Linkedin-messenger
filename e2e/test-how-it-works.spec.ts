import { test, expect } from '@playwright/test';

test('Test How It Works page', async ({ page }) => {
  // Create a test user
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@testmail.com`;
  const testPassword = 'TestPassword123!';

  // Sign up
  await page.goto('/login');
  await page.click('button:has-text("Sign Up")');
  await page.fill('#signup-email', testEmail);
  await page.fill('#signup-password', testPassword);
  await page.click('button[type="submit"]:has-text("Sign Up")');

  // Wait for redirect
  await page.waitForTimeout(2000);

  // Navigate to How It Works
  await page.goto('/how-it-works');

  // Take a screenshot
  await page.screenshot({ path: 'how-it-works-test.png', fullPage: true });

  // Check if page loaded
  const title = await page.textContent('h1');
  console.log('Page title:', title);

  // Check for content
  const hasContent = await page.locator('text="How LinkedIn Messenger Works"').isVisible();
  console.log('Has content:', hasContent);

  expect(hasContent).toBeTruthy();
});