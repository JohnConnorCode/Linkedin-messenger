import { test, expect } from '@playwright/test';

test.describe('Simple Working Tests', () => {
  test('app loads successfully', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Check that login page loads with LinkedIn Messenger title
    await expect(page.locator('h1')).toContainText(/LinkedIn Messenger/i);
  });

  test('login page has all required elements', async ({ page }) => {
    await page.goto('/login');
    
    // Check for email input
    await expect(page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')).toBeVisible();
    
    // Check for password input  
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Check for submit button
    await expect(page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")')).toBeVisible();
  });

  test('navigation redirects work', async ({ page }) => {
    // Try to access protected route
    await page.goto('/campaigns');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('help page loads', async ({ page }) => {
    await page.goto('/help');

    // Help page should redirect to login or show content
    const url = page.url();
    if (url.includes('/login')) {
      // If redirected to login, that's valid
      await expect(page).toHaveURL(/\/login/);
    } else {
      // Otherwise check for help content
      await expect(page.locator('h1, h2, h3')).toContainText(/help|how|LinkedIn Messenger/i);
    }
  });

  test('404 page handles unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    
    // Should show 404 or redirect
    const pageContent = await page.textContent('body');
    expect(pageContent).toMatch(/not found|404|does not exist|login/i);
  });
});

test.describe('Campaign Features (No Auth)', () => {
  test('campaign list redirects to login', async ({ page }) => {
    await page.goto('/campaigns');
    await expect(page).toHaveURL(/\/login/);
  });

  test('campaign detail redirects to login', async ({ page }) => {
    await page.goto('/campaigns/test-campaign-id');
    await expect(page).toHaveURL(/\/login/);
  });

  test('linkedin setup redirects to login', async ({ page }) => {
    await page.goto('/linkedin-setup');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('UI Components', () => {
  test('login form validation works', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should show validation errors or not navigate away
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('responsive design works', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    // Page should still be functional
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });
});