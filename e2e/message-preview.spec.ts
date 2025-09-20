import { test, expect } from '@playwright/test';

test.describe('Message Preview & Testing', () => {
  test('should redirect to login when accessing message preview without authentication', async ({ page }) => {
    // Navigate to a message preview page (will redirect to login)
    await page.goto('/campaigns/test-campaign-id');

    // Should be redirected to login page
    await expect(page).toHaveURL('/login');

    // Verify login page is displayed
    await expect(page.locator('h1')).toContainText('LinkedIn Messenger');
    await expect(page.locator('button[role="tab"]:has-text("Login")')).toBeVisible();
  });
});