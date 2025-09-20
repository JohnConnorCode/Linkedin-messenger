import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Check for session file
    const sessionPath = path.join(process.cwd(), 'runner', 'linkedin-session.json');

    try {
      const sessionData = await fs.readFile(sessionPath, 'utf-8');
      const session = JSON.parse(sessionData);

      // Check if session has required cookies
      const hasLiAt = session.cookies?.some((c: any) => c.name === 'li_at');
      const hasJSessionId = session.cookies?.some((c: any) => c.name === 'JSESSIONID');

      if (!hasLiAt) {
        return NextResponse.json({ status: 'none' });
      }

      // Check cookie expiry if available
      const liAtCookie = session.cookies.find((c: any) => c.name === 'li_at');
      if (liAtCookie?.expires) {
        const expiryDate = new Date(liAtCookie.expires * 1000);
        if (expiryDate < new Date()) {
          return NextResponse.json({ status: 'expired' });
        }
      }

      // Also check database for session status
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: sessionStatus } = await supabase
        .from('linkedin_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionStatus?.is_active) {
        return NextResponse.json({
          status: 'active',
          lastChecked: sessionStatus.last_used,
          sessionId: sessionStatus.id
        });
      }

      return NextResponse.json({ status: 'active' });
    } catch (error) {
      return NextResponse.json({ status: 'none' });
    }
  } catch (error) {
    console.error('Error checking session status:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}