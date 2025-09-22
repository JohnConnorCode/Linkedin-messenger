import { createServerComponentClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  if (code) {
    try {
      const supabase = await createServerComponentClient();
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error('Session exchange error:', sessionError);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`, request.url)
        );
      }

      // Successfully authenticated
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (error) {
      console.error('Unexpected error during authentication:', error);
      return NextResponse.redirect(
        new URL('/login?error=An unexpected error occurred', request.url)
      );
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}