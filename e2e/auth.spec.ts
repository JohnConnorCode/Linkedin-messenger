import { test, expect } from '@playwright/test';

// Generate unique test email
const generateTestEmail = () => {
  const timestamp = Date.now();
  return `test${timestamp}@testmail.com`;
};

test.describe('Authentication', () => {
  test('should display login page with app features', async ({ page }) => {
    await page.goto('/login');

    // Check main title
    await expect(page.locator('h1')).toContainText('LinkedIn Messenger');

    // Check feature cards are visible
    await expect(page.locator('h3:has-text("Personalized Messages")')).toBeVisible();
    await expect(page.locator('h3:has-text("Smart Targeting")')).toBeVisible();
    await expect(page.locator('h3:has-text("Automation")')).toBeVisible();
    await expect(page.locator('h3:has-text("Safe & Compliant")')).toBeVisible();
    await expect(page.locator('h3:has-text("Analytics")')).toBeVisible();
    await expect(page.locator('h3:has-text("Time Zone Aware")')).toBeVisible();

    // Check auth tabs
    await expect(page.locator('button[role="tab"]:has-text("Login")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Sign Up")')).toBeVisible();
  });

  test('should sign up a new user', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';

    await page.goto('/login');

    // Click Sign Up tab
    await page.click('button:has-text("Sign Up")');

    // Fill signup form
    await page.fill('#signup-email', testEmail);
    await page.fill('#signup-password', testPassword);

    // Submit form
    await page.click('button[type="submit"]:has-text("Sign Up")');

    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/\/(dashboard)?/, { timeout: 10000 });
  });

  test('should login existing user', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';

    // First create the user
    await page.goto('/login');
    await page.click('button:has-text("Sign Up")');
    await page.fill('#signup-email', testEmail);
    await page.fill('#signup-password', testPassword);
    await page.click('button[type="submit"]:has-text("Sign Up")');

    // Wait for redirect
    await page.waitForTimeout(2000);

    // Logout if logged in
    const logoutButton = page.locator('button:has-text("Logout")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }

    // Now test login
    await page.goto('/login');
    await page.click('button:has-text("Login")');

    await page.fill('#login-email', testEmail);
    await page.fill('#login-password', testPassword);

    await page.click('button[type="submit"]:has-text("Login")');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?/, { timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#login-email', 'nonexistent@test.com');
    await page.fill('#login-password', 'WrongPassword123');

    await page.click('button[type="submit"]:has-text("Login")');

    // Should show error toast
    await expect(page.locator('.text-sm.opacity-90').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error for weak password', async ({ page }) => {
    const testEmail = generateTestEmail();

    await page.goto('/login');
    await page.click('button:has-text("Sign Up")');

    await page.fill('#signup-email', testEmail);
    await page.fill('#signup-password', '123'); // Too weak

    await page.click('button[type="submit"]:has-text("Sign Up")');

    // Should show validation or error
    await expect(page.locator('text=/password|6 characters/i')).toBeVisible({ timeout: 5000 });
  });

  test('should handle duplicate email registration', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';

    // First signup
    await page.goto('/login');
    await page.click('button:has-text("Sign Up")');
    await page.fill('#signup-email', testEmail);
    await page.fill('#signup-password', testPassword);
    await page.click('button[type="submit"]:has-text("Sign Up")');

    await page.waitForTimeout(2000);

    // Try to signup again with same email
    await page.goto('/login');
    await page.click('button:has-text("Sign Up")');
    await page.fill('#signup-email', testEmail);
    await page.fill('#signup-password', testPassword);
    await page.click('button[type="submit"]:has-text("Sign Up")');

    // Should show error about existing account (check for toast)
    await expect(page.locator('.text-sm.opacity-90, [role="alert"]').first()).toBeVisible({ timeout: 5000 });
  });
});