import { NextResponse } from 'next/server';
import { LinkedInScraper } from '@/lib/scraper/linkedin-scraper';
import { createServerComponentClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerComponentClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, profileUrl, connectionId } = await request.json();
    const scraper = new LinkedInScraper();

    try {
      switch (action) {
        case 'scrape-profile':
          if (!profileUrl) {
            return NextResponse.json({ error: 'Missing profileUrl' }, { status: 400 });
          }

          const profileData = await scraper.scrapeProfile(profileUrl);

          if (!profileData) {
            return NextResponse.json({ error: 'Failed to scrape profile' }, { status: 500 });
          }

          // If connectionId provided, save to that specific connection
          if (connectionId) {
            await supabase
              .from('profile_raw')
              .upsert({
                connection_id: connectionId,
                raw_data: profileData,
                scraped_at: new Date().toISOString()
              });
          }

          return NextResponse.json({
            status: 'success',
            data: profileData
          });

        case 'scrape-multiple':
          const { profileUrls } = await request.json();
          if (!profileUrls || !Array.isArray(profileUrls)) {
            return NextResponse.json({ error: 'Missing or invalid profileUrls' }, { status: 400 });
          }

          const results = await scraper.scrapeMultipleProfiles(profileUrls);

          return NextResponse.json({
            status: 'success',
            data: results,
            scraped: results.length,
            total: profileUrls.length
          });

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    } finally {
      await scraper.close();
    }
  } catch (error) {
    console.error('Scraper API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}