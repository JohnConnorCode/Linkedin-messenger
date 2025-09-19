import { test, expect } from '@playwright/test';

test('How It Works page loads correctly when logged in', async ({ page }) => {
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

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard)?/, { timeout: 10000 });

  // Now navigate to How It Works
  await page.goto('/how-it-works');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Take a screenshot for debugging
  await page.screenshot({ path: 'how-it-works-logged-in.png', fullPage: true });

  // Check if we're on the How It Works page
  const url = page.url();
  console.log('Current URL:', url);

  // Check for the main title
  const h1Text = await page.locator('h1').textContent();
  console.log('H1 text:', h1Text);

  // The page should contain "How LinkedIn Messenger Works"
  expect(h1Text).toContain('How LinkedIn Messenger Works');

  // Check for key content sections
  await expect(page.locator('text="Core Features"')).toBeVisible();
  await expect(page.locator('text="Step-by-Step Process"')).toBeVisible();
  await expect(page.locator('text="What This Tool Does NOT Do"')).toBeVisible();

  // Check for navigation link in sidebar
  const navLink = page.locator('nav a:has-text("How It Works")');
  await expect(navLink).toBeVisible();

  // Should be highlighted as active
  await expect(navLink).toHaveClass(/bg-secondary/);
});