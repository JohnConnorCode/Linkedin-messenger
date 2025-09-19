import { test, expect } from '@playwright/test';

test.describe('How It Works Page', () => {
  test.beforeEach(async ({ page }) => {
    // Create and login a test user
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@testmail.com`;
    const testPassword = 'TestPassword123!';

    await page.goto('/login');
    await page.click('button:has-text("Sign Up")');
    await page.fill('#signup-email', testEmail);
    await page.fill('#signup-password', testPassword);
    await page.click('button[type="submit"]:has-text("Sign Up")');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard)?/, { timeout: 10000 });
  });

  test('should display How It Works page with all sections', async ({ page }) => {
    // Navigate to How It Works page
    await page.click('a:has-text("How It Works")');
    await expect(page).toHaveURL('/how-it-works');

    // Check main title
    await expect(page.locator('h1')).toContainText('How LinkedIn Messenger Works');

    // Check for important disclaimer
    await expect(page.locator('text=/Legal Disclaimer/i')).toBeVisible();
    await expect(page.locator('text=/does NOT fully automate/i')).toBeVisible();

    // Check for core features section
    await expect(page.locator('h2:has-text("Core Features")')).toBeVisible();

    // Check for step-by-step process
    await expect(page.locator('h2:has-text("Step-by-Step Process")')).toBeVisible();
    await expect(page.locator('text="Step 1: Import Connections"')).toBeVisible();
    await expect(page.locator('text="Step 2: Create Message Templates"')).toBeVisible();
    await expect(page.locator('text="Step 3: Select Recipients"')).toBeVisible();
    await expect(page.locator('text="Step 4: Review & Approve Messages"')).toBeVisible();
    await expect(page.locator('text="Step 5: Manual Sending"')).toBeVisible();
    await expect(page.locator('text="Step 6: Track Performance"')).toBeVisible();

    // Check for "What This Tool Does NOT Do" section
    await expect(page.locator('text="What This Tool Does NOT Do"')).toBeVisible();
    await expect(page.locator('text=/Does NOT automatically send messages/i')).toBeVisible();
    await expect(page.locator('text=/Does NOT access your LinkedIn account/i')).toBeVisible();

    // Check for Best Practices section
    await expect(page.locator('text="Best Practices for Safe Usage"')).toBeVisible();

    // Check for Technical Implementation section
    await expect(page.locator('text="Technical Implementation"')).toBeVisible();
  });

  test('should have working navigation from sidebar', async ({ page }) => {
    // Click on How It Works in sidebar
    const howItWorksLink = page.locator('nav a:has-text("How It Works")');
    await expect(howItWorksLink).toBeVisible();
    await howItWorksLink.click();

    // Should navigate to the correct page
    await expect(page).toHaveURL('/how-it-works');

    // Should highlight the active link
    await expect(howItWorksLink).toHaveClass(/bg-secondary/);
  });

  test('should display honest warnings and disclaimers', async ({ page }) => {
    await page.goto('/how-it-works');

    // Check for LinkedIn ToS warning
    await expect(page.locator('text=/LinkedIn prohibits automated messaging/i')).toBeVisible();

    // Check for manual process emphasis
    await expect(page.locator('text=/All messages require manual review/i')).toBeVisible();

    // Check for risk disclaimer
    await expect(page.locator('text=/at your own risk/i')).toBeVisible();

    // Check for rate limiting advice
    await expect(page.locator('text=/Limit to 20-30 messages per day/i')).toBeVisible();

    // Check that we're clear about no automation
    const manualSendingCard = page.locator('text="Step 5: Manual Sending"').locator('..');
    await expect(manualSendingCard.locator('text=/does NOT send messages automatically/i')).toBeVisible();
  });

  test('feature cards should be consistent with login page', async ({ page }) => {
    // Go to How It Works page
    await page.goto('/how-it-works');

    // Check feature cards exist
    await expect(page.locator('h3:has-text("Personalized Messages")')).toBeVisible();
    await expect(page.locator('h3:has-text("Smart Targeting")')).toBeVisible();
    await expect(page.locator('h3:has-text("Semi-Automated Sending")')).toBeVisible();
    await expect(page.locator('h3:has-text("Safety Features")')).toBeVisible();
    await expect(page.locator('h3:has-text("Campaign Analytics")')).toBeVisible();
    await expect(page.locator('h3:has-text("Scheduled Campaigns")')).toBeVisible();
  });
});