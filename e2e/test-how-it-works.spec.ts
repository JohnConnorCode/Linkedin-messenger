import { test, expect } from '@playwright/test';

test('Test How It Works page', async ({ page }) => {
  // Navigate to how-it-works page (will redirect to login)
  await page.goto('/how-it-works');

  // Should be redirected to login page
  await expect(page).toHaveURL('/login');

  // Verify login page is displayed
  await expect(page.locator('h1')).toContainText('LinkedIn Messenger');
  await expect(page.locator('button[role="tab"]:has-text("Login")')).toBeVisible();
});