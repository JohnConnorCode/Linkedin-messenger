import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Decrypt sensitive data
function decrypt(encryptedData: string): string {
  try {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32-chars-long!!', 'utf-8').slice(0, 32);

    const { iv, authTag, encrypted } = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // If decryption fails, assume it's not encrypted
    return encryptedData;
  }
}

export async function POST() {
  let browser = null;
  let context = null;

  try {
    // Load session data
    const sessionPath = path.join(process.cwd(), 'runner', 'linkedin-session.json');
    const sessionData = await fs.readFile(sessionPath, 'utf-8');
    const session = JSON.parse(sessionData);

    // Decrypt cookies
    const cookies = session.cookies.map((cookie: any) => ({
      ...cookie,
      value: (cookie.name === 'li_at' || cookie.name === 'JSESSIONID')
        ? decrypt(cookie.value)
        : cookie.value
    }));

    // Create browser context with cookies
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-web-security'
      ]
    });

    context = await browser.newContext({
      viewport: session.viewport || { width: 1366, height: 768 },
      userAgent: session.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });

    // Add cookies to context
    await context.addCookies(cookies.map((cookie: any) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || '.linkedin.com',
      path: cookie.path || '/',
      expires: cookie.expires || undefined,
      httpOnly: cookie.httpOnly !== false,
      secure: cookie.secure !== false,
      sameSite: cookie.sameSite || 'None'
    })));

    // Navigate to LinkedIn and check if logged in
    const page = await context.newPage();

    // Anti-detection script
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });

    await page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      return !window.location.href.includes('/login') &&
             !window.location.href.includes('/checkpoint') &&
             !window.location.href.includes('/authwall');
    });

    if (!isLoggedIn) {
      return NextResponse.json({
        success: false,
        error: 'Not logged in - session may have expired',
        needsRefresh: true
      });
    }

    // Check for rate limiting
    const hasRateLimit = await page.locator('text=/temporarily restricted/i').count() > 0;
    if (hasRateLimit) {
      return NextResponse.json({
        success: false,
        error: 'LinkedIn rate limit detected',
        rateLimited: true
      });
    }

    // Try to get user profile info
    let profileInfo = null;
    try {
      await page.goto('https://www.linkedin.com/in/me/', {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      profileInfo = await page.evaluate(() => {
        const nameElement = document.querySelector('h1');
        const headlineElement = document.querySelector('[data-generated-suggestion-target]');

        return {
          name: nameElement?.textContent?.trim() || 'Unknown',
          headline: headlineElement?.textContent?.trim() || 'N/A'
        };
      });
    } catch (e) {
      console.log('Could not fetch profile info:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'LinkedIn connection successful',
      profile: profileInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Connection test failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    // Clean up
    if (context) await context.close();
    if (browser) await browser.close();
  }
}