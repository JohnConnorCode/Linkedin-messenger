import { test, expect } from '@playwright/test';

test.describe('Campaign Control Center', () => {
  test('should redirect to login when accessing campaign control center without authentication', async ({ page }) => {
    // Navigate to a campaign control center page (will redirect to login)
    await page.goto('/campaigns/test-campaign-id');

    // Should be redirected to login page
    await expect(page).toHaveURL('/login');

    // Verify login page is displayed
    await expect(page.locator('h1')).toContainText('LinkedIn Messenger');
    await expect(page.locator('button[role="tab"]:has-text("Login")')).toBeVisible();
  });

});