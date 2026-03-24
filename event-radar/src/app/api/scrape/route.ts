import { NextRequest, NextResponse } from 'next/server';
import { scrapeAllSources } from '@/lib/scraper';

// POST /api/scrape — trigger a scrape of all sources
// Can be called manually or via Vercel Cron
export async function POST(request: NextRequest) {
  // Verify cron secret if set (for automated scraping via Vercel Cron)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await scrapeAllSources();
    return NextResponse.json({
      success: true,
      events_processed: result.total,
      errors: result.errors,
      scraped_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scrape failed' },
      { status: 500 }
    );
  }
}

// GET /api/scrape — also allow GET for Vercel Cron compatibility
export async function GET(request: NextRequest) {
  return POST(request);
}
