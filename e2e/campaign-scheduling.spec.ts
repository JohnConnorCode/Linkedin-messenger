import { test, expect } from '@playwright/test';

test.describe('Campaign Scheduler', () => {
  test('should redirect to login when accessing campaign scheduler without authentication', async ({ page }) => {
    // Navigate to a campaign scheduler page (will redirect to login)
    await page.goto('/campaigns/test-campaign-id');

    // Should be redirected to login page
    await expect(page).toHaveURL('/login');

    // Verify login page is displayed
    await expect(page.locator('h1')).toContainText('LinkedIn Messenger');
    await expect(page.locator('button[role="tab"]:has-text("Login")')).toBeVisible();
  });
});