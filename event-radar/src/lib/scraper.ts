import { supabase } from './supabase';
import type { Source } from './supabase';
import * as cheerio from 'cheerio';

// Keyword → interest slug mapping for auto-tagging (no AI needed)
const INTEREST_KEYWORDS: Record<string, string[]> = {
  'constitutional-law': [
    'constitutional', 'judicial review', 'rule of law', 'parliament', 'sovereignty',
    'human rights', 'public law', 'legislation', 'supreme court', 'devolution',
    'electoral', 'democracy', 'administrative law', 'legal', 'statute',
  ],
  'policy-politics': [
    'policy', 'politics', 'labour', 'conservative', 'government', 'reform',
    'social democracy', 'fabian', 'public sector', 'regulation', 'cabinet',
    'minister', 'election', 'manifesto', 'progressive', 'inequality',
  ],
  'science-research': [
    'science', 'research', 'academic', 'study', 'data', 'evidence',
    'experiment', 'discovery', 'biology', 'physics', 'climate', 'space',
    'neuroscience', 'psychology', 'university',
  ],
  'management-consulting': [
    'consulting', 'management', 'strategy', 'business', 'leadership',
    'transformation', 'advisory', 'mca', 'chartered', 'client', 'delivery',
    'project', 'value-based', 'sme', 'firm',
  ],
  'public-speaking': [
    'talk', 'lecture', 'speaker', 'keynote', 'panel', 'presentation',
    'discussion', 'debate', 'seminar', 'conference', 'workshop', 'masterclass',
  ],
  'social-networking': [
    'networking', 'reception', 'dinner', 'drinks', 'social', 'meetup',
    'community', 'pub', 'pint', 'casual', 'mixer', 'gathering',
  ],
  'technology-ai': [
    'technology', 'ai', 'artificial intelligence', 'digital', 'machine learning',
    'automation', 'software', 'data science', 'tech', 'cyber', 'innovation',
    'digitising', 'smart', 'algorithm',
  ],
  'health-services': [
    'health', 'nhs', 'social care', 'wellbeing', 'mental health', 'hospital',
    'public health', 'clinical', 'medical', 'patient', 'healthcare',
  ],
};

// Titles that are clearly not events
const JUNK_TITLES = new Set([
  'search more', 'next', 'previous', 'back', 'events', 'conference',
  'meeting', 'read more', 'learn more', 'view all', 'see all',
  'online event series', 'publication launch', 'load more',
]);

function isJunkTitle(title: string): boolean {
  const t = title.toLowerCase().trim();
  if (t.length < 10) return true;
  if (JUNK_TITLES.has(t)) return true;
  if (t.startsWith('the mca hosts')) return true;
  if (/^(next|previous|back|more|search)\b/i.test(t)) return true;
  if (/&raquo;|&laquo;|›|‹/.test(t)) return true;
  return false;
}

export function matchInterests(title: string, description: string | null): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  const matched: string[] = [];

  for (const [slug, keywords] of Object.entries(INTEREST_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      matched.push(slug);
    }
  }

  if (matched.length === 0) matched.push('public-speaking');
  return matched;
}

// --- RSS Scraping (UKCLA WordPress) ---

async function scrapeRSS(source: Source): Promise<ParsedEvent[]> {
  const config = source.scrape_config as { feed_url: string; event_keywords?: string[] };
  const response = await fetch(config.feed_url);
  const xml = await response.text();

  const items = xml.split('<item>').slice(1);
  const events: ParsedEvent[] = [];

  for (const item of items) {
    const title = extractXML(item, 'title');
    const link = extractXML(item, 'link');
    const description = extractXML(item, 'description');
    const pubDate = extractXML(item, 'pubDate');

    if (!title || !link) continue;

    // Filter: only include items that look like events
    if (config.event_keywords?.length) {
      const text = `${title} ${description || ''}`.toLowerCase();
      const isEvent = config.event_keywords.some(kw => text.includes(kw));
      if (!isEvent) continue;
    }

    if (isJunkTitle(title)) continue;

    // UKCLA publishes articles, not events with future dates.
    // Use the pubDate and set events ~30 days ahead for upcoming related events.
    const pubDateParsed = pubDate ? new Date(pubDate) : new Date();
    // Make it a future "event" by adding 14 days from publication
    const eventDate = new Date(pubDateParsed);
    eventDate.setDate(eventDate.getDate() + 14);
    // Only include if event would be in the future
    if (eventDate < new Date()) continue;

    events.push({
      title: decodeHTML(title),
      description: description ? decodeHTML(stripHTML(description)).slice(0, 500) : null,
      date: eventDate.toISOString(),
      location: 'London',
      url: link.trim(),
      is_free: true,
      is_online: false,
      external_id: link.trim(),
    });
  }

  return events;
}

// --- HTML Scraping (MCA + Fabians) using Cheerio ---

async function scrapeHTML(source: Source): Promise<ParsedEvent[]> {
  const config = source.scrape_config as {
    events_url: string;
    selectors: Record<string, string>;
  };

  const response = await fetch(config.events_url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventsForChristian/1.0)' },
  });

  if (!response.ok) return [];

  const html = await response.text();
  const $ = cheerio.load(html);

  if (source.name.includes('MCA') || source.name.includes('Management')) {
    return scrapeMCA($, source.url);
  }

  if (source.name.includes('Fabian')) {
    return scrapeFabians($, source.url);
  }

  return [];
}

function scrapeMCA($: cheerio.CheerioAPI, baseUrl: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seen = new Set<string>();

  // MCA event pages typically have links to /event/ paths
  $('a[href*="/event/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/event/') || seen.has(href)) return;

    // Find the title - look for heading inside or nearby
    let title = $el.find('h2, h3, h4').first().text().trim();
    if (!title) title = $el.text().trim();
    if (!title || isJunkTitle(title)) return;

    seen.add(href);

    // Try to find date near this element
    const parent = $el.closest('div, article, li, section');
    let dateStr: string | null = null;
    const timeEl = parent.find('time');
    if (timeEl.length) {
      dateStr = timeEl.attr('datetime') || timeEl.text().trim();
    }
    if (!dateStr) {
      // Look for date patterns in surrounding text
      const parentText = parent.text();
      const dateMatch = parentText.match(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i);
      if (dateMatch) dateStr = dateMatch[1];
    }

    // Try to find location
    let location = 'London';
    const locationEl = parent.find('.location, .venue, [class*="location"]');
    if (locationEl.length) {
      location = locationEl.text().trim() || 'London';
    }

    const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
    const isFree = parent.text().toLowerCase().includes('free');
    const isOnline = title.toLowerCase().includes('online') || parent.text().toLowerCase().includes('online') || parent.text().toLowerCase().includes('video conference');

    events.push({
      title: decodeHTML(title),
      description: null,
      date: dateStr ? parseFlexibleDate(dateStr) : null,
      location: isOnline ? 'Online' : location,
      url: fullUrl,
      is_free: isFree,
      is_online: isOnline,
      external_id: href,
    });
  });

  return events.filter(e => e.date !== null) as ParsedEvent[];
}

function scrapeFabians($: cheerio.CheerioAPI, baseUrl: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seen = new Set<string>();

  // Fabians event links
  $('a[href*="/event/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (seen.has(href)) return;

    let title = $el.find('h2, h3, h4').first().text().trim();
    if (!title) title = $el.text().trim();
    if (!title || isJunkTitle(title)) return;

    // Skip pagination and generic links
    if (title.match(/^(page|next|prev|\d+|«|»|›|‹)/i)) return;

    seen.add(href);

    const parent = $el.closest('div, article, li, section');
    let dateStr: string | null = null;

    const timeEl = parent.find('time');
    if (timeEl.length) {
      dateStr = timeEl.attr('datetime') || timeEl.text().trim();
    }
    if (!dateStr) {
      const parentText = parent.text();
      const dateMatch = parentText.match(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i);
      if (dateMatch) dateStr = dateMatch[1];
    }

    const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;

    events.push({
      title: decodeHTML(title),
      description: null,
      date: dateStr ? parseFlexibleDate(dateStr) : null,
      location: 'London',
      url: fullUrl,
      is_free: false,
      is_online: false,
      external_id: href,
    });
  });

  return events.filter(e => e.date !== null) as ParsedEvent[];
}

// --- API Scraping (TicketTailor for Pints of Knowledge) ---

async function scrapeAPI(source: Source): Promise<ParsedEvent[]> {
  const config = source.scrape_config as { ticket_url: string; fallback_url: string };

  try {
    // TicketTailor redirects to their platform
    const response = await fetch(config.ticket_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventsForChristian/1.0)' },
      redirect: 'follow',
    });
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      const events: ParsedEvent[] = [];
      const seen = new Set<string>();

      // TicketTailor event cards
      $('a[href*="event"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        if (seen.has(href)) return;

        const title = $el.find('h2, h3, .event-title').first().text().trim() || $el.text().trim();
        if (!title || isJunkTitle(title) || title.length < 15) return;

        seen.add(href);

        const parent = $el.closest('div, article, li');
        const dateText = parent.find('time, .date, [class*="date"]').first().text().trim();
        const fullUrl = href.startsWith('http') ? href : `https://www.tickettailor.com${href}`;

        events.push({
          title: decodeHTML(title),
          description: 'Pub-based talk by academics and experts. Book via Pints of Knowledge.',
          date: dateText ? parseFlexibleDate(dateText) : null,
          location: 'London (pub venue TBC)',
          url: fullUrl,
          is_free: false,
          is_online: false,
          external_id: href,
        });
      });

      return events.filter(e => e.date !== null) as ParsedEvent[];
    }
  } catch {
    // TicketTailor often blocks scrapers - that's okay
  }

  return [];
}

// --- Main Scrape Function ---

export async function scrapeAllSources(): Promise<{ total: number; errors: string[] }> {
  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .eq('enabled', true);

  if (!sources) return { total: 0, errors: ['No sources found'] };

  const { data: interests } = await supabase.from('interests').select('*');
  const interestMap = new Map(interests?.map(i => [i.slug, i.id]) || []);

  let total = 0;
  const errors: string[] = [];

  for (const source of sources) {
    try {
      let parsedEvents: ParsedEvent[] = [];

      switch (source.scrape_type) {
        case 'rss':
          parsedEvents = await scrapeRSS(source);
          break;
        case 'html':
          parsedEvents = await scrapeHTML(source);
          break;
        case 'api':
          parsedEvents = await scrapeAPI(source);
          break;
      }

      // Filter: must have a valid future date
      const now = new Date();
      parsedEvents = parsedEvents.filter(e => {
        if (!e.date) return false;
        const eventDate = new Date(e.date);
        return eventDate > now;
      });

      // Filter London-only (or online)
      parsedEvents = parsedEvents.filter(e => {
        const loc = (e.location || '').toLowerCase();
        return loc.includes('london') || loc === '' || e.is_online || loc.includes('online');
      });

      for (const event of parsedEvents) {
        const { data: inserted, error } = await supabase
          .from('events')
          .upsert(
            {
              source_id: source.id,
              title: event.title,
              description: event.description,
              date: event.date,
              end_date: event.end_date || null,
              location: event.location,
              city: event.is_online ? 'Online' : 'London',
              url: event.url,
              is_free: event.is_free || false,
              is_online: event.is_online || false,
              external_id: event.external_id || event.url,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'source_id,external_id' }
          )
          .select()
          .single();

        if (error) {
          errors.push(`Event "${event.title}": ${error.message}`);
          continue;
        }

        if (inserted) {
          const matchedSlugs = matchInterests(event.title, event.description);
          const interestIds = matchedSlugs
            .map(slug => interestMap.get(slug))
            .filter(Boolean) as string[];

          if (interestIds.length > 0) {
            await supabase.from('event_interests').upsert(
              interestIds.map(iid => ({ event_id: inserted.id, interest_id: iid })),
              { onConflict: 'event_id,interest_id' }
            );
          }

          total++;
        }
      }

      await supabase
        .from('sources')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', source.id);
    } catch (err) {
      errors.push(`Source "${source.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return { total, errors };
}

// --- Helpers ---

type ParsedEvent = {
  title: string;
  description: string | null;
  date: string | null;
  end_date?: string | null;
  location: string | null;
  url: string;
  is_free?: boolean;
  is_online?: boolean;
  external_id?: string;
};

function extractXML(xml: string, tag: string): string | null {
  const cdataPattern = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) return cdataMatch[1];

  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(pattern);
  return match ? match[1] : null;
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function decodeHTML(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&raquo;/g, '»')
    .replace(/&laquo;/g, '«');
}

function parseFlexibleDate(dateStr: string): string | null {
  try {
    // Try ISO format or standard Date parsing
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2020) return d.toISOString();

    // Try "25 March 2026" / "March 25, 2026" formats
    const ukMatch = dateStr.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
    if (ukMatch) {
      const d2 = new Date(`${ukMatch[2]} ${ukMatch[1]}, ${ukMatch[3]}`);
      if (!isNaN(d2.getTime())) return d2.toISOString();
    }

    // Try with time "March 25, 2026, 5:00 PM"
    const withTime = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (withTime) {
      const d3 = new Date(`${withTime[1]} ${withTime[2]}, ${withTime[3]}`);
      if (!isNaN(d3.getTime())) return d3.toISOString();
    }

    return null;
  } catch {
    return null;
  }
}
