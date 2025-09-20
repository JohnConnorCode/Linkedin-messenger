import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Encrypt sensitive data
function encrypt(text: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32-chars-long!!', 'utf-8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted: encrypted,
  });
}

export async function POST(request: Request) {
  try {
    const { cookies: cookieString } = await request.json();

    if (!cookieString) {
      return NextResponse.json({ error: 'No cookies provided' }, { status: 400 });
    }

    // Parse cookies if they're in string format
    let cookiesData;
    try {
      cookiesData = typeof cookieString === 'string' ? JSON.parse(cookieString) : cookieString;
    } catch (e) {
      // If not JSON, try to parse as raw cookie string
      cookiesData = parseCookieString(cookieString);
    }

    // Validate we have the required li_at cookie
    const hasLiAt = Array.isArray(cookiesData)
      ? cookiesData.some((c: any) => c.name === 'li_at')
      : cookiesData.cookies?.some((c: any) => c.name === 'li_at');

    if (!hasLiAt) {
      return NextResponse.json({ error: 'Missing required li_at cookie' }, { status: 400 });
    }

    // Format session data
    const sessionData = {
      cookies: Array.isArray(cookiesData) ? cookiesData : cookiesData.cookies || [],
      userAgent: cookiesData.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: cookiesData.viewport || { width: 1366, height: 768 },
      savedAt: new Date().toISOString(),
      version: '2.0'
    };

    // Save to file system (encrypted)
    const sessionPath = path.join(process.cwd(), 'runner', 'linkedin-session.json');
    await fs.mkdir(path.dirname(sessionPath), { recursive: true });

    // Encrypt sensitive data
    const encryptedSession = {
      ...sessionData,
      cookies: sessionData.cookies.map((cookie: any) => ({
        ...cookie,
        value: cookie.name === 'li_at' || cookie.name === 'JSESSIONID'
          ? encrypt(cookie.value)
          : cookie.value
      }))
    };

    await fs.writeFile(sessionPath, JSON.stringify(encryptedSession, null, 2));

    // Also save to database for tracking
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user } = await supabase.auth.getUser();

    if (user?.user) {
      // Extract encryption components
      const encryptedLiAt = sessionData.cookies.find((c: any) => c.name === 'li_at')?.value;
      let encryptionData = { encrypted: '', iv: '', authTag: '' };

      if (encryptedLiAt) {
        try {
          encryptionData = JSON.parse(encryptedLiAt);
        } catch (e) {
          // Fallback if not encrypted yet
          encryptionData = {
            encrypted: encryptedLiAt,
            iv: crypto.randomBytes(16).toString('hex'),
            authTag: crypto.randomBytes(16).toString('hex')
          };
        }
      }

      // Calculate expiry (LinkedIn cookies typically last 1 year)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Deactivate old sessions and insert new one
      await supabase.from('linkedin_sessions').update({
        is_active: false
      }).eq('user_id', user.user.id);

      const { error } = await supabase.from('linkedin_sessions').insert({
        user_id: user.user.id,
        encrypted_cookies: JSON.stringify(encryptedSession.cookies),
        encryption_iv: encryptionData.iv,
        encryption_auth_tag: encryptionData.authTag,
        user_agent: sessionData.userAgent,
        viewport: sessionData.viewport,
        is_active: true,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Database save error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'LinkedIn session saved successfully'
    });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { error: 'Failed to save session', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to parse raw cookie string
function parseCookieString(cookieStr: string) {
  const cookies = [];
  const pairs = cookieStr.split(';');

  pairs.forEach(pair => {
    const [name, ...valueParts] = pair.trim().split('=');
    if (name && valueParts.length > 0) {
      cookies.push({
        name: name.trim(),
        value: valueParts.join('='),
        domain: '.linkedin.com',
        path: '/',
        httpOnly: true,
        secure: true
      });
    }
  });

  return { cookies };
}