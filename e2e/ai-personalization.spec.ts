import { test, expect } from '@playwright/test';

test.describe('AI Personalization End-to-End', () => {
  test('should redirect to login when accessing AI personalization without authentication', async ({ page }) => {
    // Navigate to a AI personalization page (will redirect to login)
    await page.goto('/campaigns/test-campaign-id');

    // Should be redirected to login page
    await expect(page).toHaveURL('/login');

    // Verify login page is displayed
    await expect(page.locator('h1')).toContainText('LinkedIn Messenger');
    await expect(page.locator('button[role="tab"]:has-text("Login")')).toBeVisible();
  });
});

test.describe('AI UI Components', () => {
  test('should redirect to login when accessing AI UI components without authentication', async ({ page }) => {
    // Navigate to a AI UI components page (will redirect to login)
    await page.goto('/campaigns/test-campaign-id');

    // Should be redirected to login page
    await expect(page).toHaveURL('/login');

    // Verify login page is displayed
    await expect(page.locator('h1')).toContainText('LinkedIn Messenger');
    await expect(page.locator('button[role="tab"]:has-text("Login")')).toBeVisible();
  });
});