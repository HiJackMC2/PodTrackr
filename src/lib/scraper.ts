import { supabase } from './supabase';
import type { Source } from './supabase';
import * as cheerio from 'cheerio';

// Well-known London venue coordinates for map visualization
const VENUE_COORDS: Record<string, { lat: number; lng: number }> = {
  'lse': { lat: 51.5144, lng: -0.1165 },
  'ucl': { lat: 51.5246, lng: -0.1340 },
  'kcl': { lat: 51.5115, lng: -0.1160 },
  'kings college': { lat: 51.5115, lng: -0.1160 },
  'chatham house': { lat: 51.5074, lng: -0.1416 },
  'rsa': { lat: 51.5093, lng: -0.1222 },
  'royal society of arts': { lat: 51.5093, lng: -0.1222 },
  'british academy': { lat: 51.5062, lng: -0.1316 },
  'conway hall': { lat: 51.5225, lng: -0.1201 },
  'gresham college': { lat: 51.5180, lng: -0.1095 },
  'royal institution': { lat: 51.5095, lng: -0.1419 },
  'southbank centre': { lat: 51.5063, lng: -0.1167 },
  'science museum': { lat: 51.4978, lng: -0.1745 },
  'institute for government': { lat: 51.5015, lng: -0.1307 },
  'ippr': { lat: 51.5255, lng: -0.0890 },
  'fabian society': { lat: 51.5220, lng: -0.1050 },
  'westminster': { lat: 51.4995, lng: -0.1248 },
  'holborn': { lat: 51.5174, lng: -0.1201 },
  'strand': { lat: 51.5115, lng: -0.1177 },
  'bloomsbury': { lat: 51.5225, lng: -0.1278 },
  'london bridge': { lat: 51.5079, lng: -0.0877 },
  'shoreditch': { lat: 51.5263, lng: -0.0813 },
  'islington': { lat: 51.5362, lng: -0.1033 },
  'mayfair': { lat: 51.5094, lng: -0.1476 },
  'london': { lat: 51.5074, lng: -0.1278 },
};

function guessCoordinates(location: string | null, sourceName: string): { lat: number; lng: number } | null {
  const text = `${location || ''} ${sourceName}`.toLowerCase();
  for (const [key, coords] of Object.entries(VENUE_COORDS)) {
    if (text.includes(key)) return coords;
  }
  // Default London center for London events
  if (text.includes('london') || location) {
    return { lat: 51.5074 + (Math.random() - 0.5) * 0.02, lng: -0.1278 + (Math.random() - 0.5) * 0.02 };
  }
  return null;
}

// Keyword → interest slug mapping for auto-tagging (no AI needed)
const INTEREST_KEYWORDS: Record<string, string[]> = {
  'constitutional-law': [
    'constitutional', 'judicial review', 'rule of law', 'parliament', 'sovereignty',
    'human rights', 'public law', 'legislation', 'supreme court', 'devolution',
    'electoral', 'democracy', 'administrative law', 'legal', 'statute',
    'bingham', 'justice', 'court', 'tribunal', 'charter',
  ],
  'policy-politics': [
    'policy', 'politics', 'labour', 'conservative', 'government', 'reform',
    'social democracy', 'fabian', 'public sector', 'regulation', 'cabinet',
    'minister', 'election', 'manifesto', 'progressive', 'inequality',
    'think tank', 'public services', 'welfare', 'housing',
  ],
  'science-research': [
    'science', 'research', 'academic', 'study', 'data', 'evidence',
    'experiment', 'discovery', 'biology', 'physics', 'climate', 'space',
    'neuroscience', 'psychology', 'university', 'chemistry', 'astronomy',
    'evolution', 'mathematics', 'engineering',
  ],
  'management-consulting': [
    'consulting', 'management', 'strategy', 'business', 'leadership',
    'transformation', 'advisory', 'mca', 'chartered', 'client', 'delivery',
    'project', 'value-based', 'sme', 'firm', 'productivity',
  ],
  'public-speaking': [
    'talk', 'lecture', 'speaker', 'keynote', 'panel', 'presentation',
    'discussion', 'debate', 'seminar', 'conference', 'workshop', 'masterclass',
    'discourse', 'symposium',
  ],
  'social-networking': [
    'networking', 'reception', 'dinner', 'drinks', 'social', 'meetup',
    'community', 'pub', 'pint', 'casual', 'mixer', 'gathering',
  ],
  'technology-ai': [
    'technology', 'ai', 'artificial intelligence', 'digital', 'machine learning',
    'automation', 'software', 'data science', 'tech', 'cyber', 'innovation',
    'digitising', 'smart', 'algorithm', 'blockchain', 'quantum',
  ],
  'health-services': [
    'health', 'nhs', 'social care', 'wellbeing', 'mental health', 'hospital',
    'public health', 'clinical', 'medical', 'patient', 'healthcare',
  ],
  'economics-fiscal': [
    'economics', 'fiscal', 'tax', 'budget', 'growth', 'inflation',
    'monetary', 'trade', 'gdp', 'wages', 'living standards', 'poverty',
    'income', 'wealth', 'macroeconom', 'microeconom', 'ifs',
  ],
  'international-affairs': [
    'international', 'foreign policy', 'geopolitics', 'security', 'defence',
    'nato', 'un', 'eu', 'brexit', 'diplomacy', 'global', 'conflict',
    'migration', 'refugee', 'sanctions', 'sovereignty',
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

// --- RSS Scraping (UKCLA WordPress, Chatham House, Smart Thinking) ---

async function scrapeRSS(source: Source): Promise<ParsedEvent[]> {
  const config = source.scrape_config as { feed_url: string; event_keywords?: string[] };
  const response = await fetch(config.feed_url, { signal: AbortSignal.timeout(5000) });
  const xml = await response.text();

  const items = xml.split('<item>').slice(1);
  const events: ParsedEvent[] = [];

  for (const item of items) {
    const title = extractXML(item, 'title');
    const link = extractXML(item, 'link');
    const description = extractXML(item, 'description');
    const pubDate = extractXML(item, 'pubDate');

    if (!title || !link) continue;

    // Filter: only include items that look like events (if keywords specified)
    if (config.event_keywords?.length) {
      const text = `${title} ${description || ''}`.toLowerCase();
      const isEvent = config.event_keywords.some(kw => text.includes(kw));
      if (!isEvent) continue;
    }

    if (isJunkTitle(title)) continue;

    const pubDateParsed = pubDate ? new Date(pubDate) : new Date();
    // For sources without real event dates, estimate from publication
    const eventDate = new Date(pubDateParsed);
    eventDate.setDate(eventDate.getDate() + 14);
    if (eventDate < new Date()) continue;

    const coords = guessCoordinates(null, source.name);

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

// --- Generic HTML Scraping (works for all HTML sources) ---

async function scrapeHTML(source: Source): Promise<ParsedEvent[]> {
  const config = source.scrape_config as {
    events_url: string;
    selectors: Record<string, string>;
  };

  let response;
  try {
    response = await fetch(config.events_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventsForChristian/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return [];
  }

  if (!response.ok) return [];

  const html = await response.text();
  const $ = cheerio.load(html);

  // Source-specific scrapers for known patterns
  if (source.name.includes('MCA') || source.name.includes('Management')) {
    return scrapeMCA($, source.url);
  }
  if (source.name.includes('Fabian')) {
    return scrapeFabians($, source.url);
  }

  // Generic scraper for all other HTML sources
  return scrapeGenericHTML($, source.url, source.name, config.selectors);
}

function scrapeGenericHTML(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  sourceName: string,
  selectors: Record<string, string>
): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seen = new Set<string>();

  // Try to find event links using configured selectors
  const linkSelector = selectors?.link || 'a[href*="event"], a[href*="lecture"], a[href*="seminar"], a[href*="talk"], a[href*="whats-on"]';

  $(linkSelector).each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href || seen.has(href)) return;
    if (href === '#' || href.startsWith('javascript:')) return;

    let title = $el.find('h1, h2, h3, h4').first().text().trim();
    if (!title) title = $el.text().trim();
    if (!title || isJunkTitle(title)) return;
    // Clean up multi-line titles
    title = title.replace(/\s+/g, ' ').trim();
    if (title.length > 200) title = title.slice(0, 200);

    seen.add(href);

    const parent = $el.closest('div, article, li, section');
    let dateStr: string | null = null;

    // Try time element first
    const timeEl = parent.find('time');
    if (timeEl.length) {
      dateStr = timeEl.attr('datetime') || timeEl.text().trim();
    }
    // Then look for date patterns in text (long months)
    if (!dateStr) {
      const parentText = parent.text();
      const dateMatch = parentText.match(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i);
      if (dateMatch) dateStr = dateMatch[1];
    }
    // Short month format: "25 Mar 2026" or "Mar 25, 2026"
    if (!dateStr) {
      const parentText = parent.text();
      const shortMatch = parentText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i);
      if (shortMatch) dateStr = shortMatch[1];
    }
    // Short month without year: "25 Mar" or "Tue 25 Mar"
    if (!dateStr) {
      const parentText = parent.text();
      const noYearMatch = parentText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\b/i);
      if (noYearMatch) dateStr = noYearMatch[1];
    }
    // Try ISO-ish dates
    if (!dateStr) {
      const parentText = parent.text();
      const isoMatch = parentText.match(/(\d{4}-\d{2}-\d{2})/);
      if (isoMatch) dateStr = isoMatch[1];
    }
    // Try extracting date from URL path (e.g. /events/2026/03/25/ or /events/2026-03-25)
    if (!dateStr) {
      const urlDateMatch = href.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      if (urlDateMatch) dateStr = `${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}`;
    }

    let location = 'London';
    const locationEl = parent.find('.location, .venue, [class*="location"], [class*="venue"]');
    if (locationEl.length) {
      location = locationEl.text().trim() || 'London';
    }

    // Try to extract description
    let description: string | null = null;
    const descEl = parent.find('p, .description, .excerpt, .summary, [class*="description"], [class*="excerpt"]');
    if (descEl.length) {
      description = descEl.first().text().trim().slice(0, 500) || null;
    }

    const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
    const textLower = parent.text().toLowerCase();
    const isFree = textLower.includes('free') || textLower.includes('no charge');
    const isOnline = title.toLowerCase().includes('online') || textLower.includes('online event') || textLower.includes('virtual');

    const coords = guessCoordinates(location, sourceName);

    events.push({
      title: decodeHTML(title),
      description,
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

function scrapeMCA($: cheerio.CheerioAPI, baseUrl: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seen = new Set<string>();

  $('a[href*="/event/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/event/') || seen.has(href)) return;

    let title = $el.find('h2, h3, h4').first().text().trim();
    if (!title) title = $el.text().trim();
    if (!title || isJunkTitle(title)) return;

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

    let location = 'London';
    const locationEl = parent.find('.location, .venue, [class*="location"]');
    if (locationEl.length) {
      location = locationEl.text().trim() || 'London';
    }

    const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
    const isFree = parent.text().toLowerCase().includes('free');
    const isOnline = title.toLowerCase().includes('online') || parent.text().toLowerCase().includes('online') || parent.text().toLowerCase().includes('video conference');
    const coords = guessCoordinates(location, 'mca');

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

  $('a[href*="/event/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (seen.has(href)) return;

    let title = $el.find('h2, h3, h4').first().text().trim();
    if (!title) title = $el.text().trim();
    if (!title || isJunkTitle(title)) return;
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
    const coords = guessCoordinates('london', 'fabian');

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
    const response = await fetch(config.ticket_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventsForChristian/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      const events: ParsedEvent[] = [];
      const seen = new Set<string>();

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

// Scrape a single source and return parsed events
async function scrapeSource(source: Source): Promise<{ events: ParsedEvent[]; error?: string }> {
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
    const NON_LONDON_CITIES = ['manchester', 'birmingham', 'edinburgh', 'glasgow', 'cardiff', 'bristol', 'leeds', 'liverpool', 'sheffield', 'newcastle', 'nottingham', 'belfast', 'oxford', 'cambridge'];
    parsedEvents = parsedEvents.filter(e => {
      const loc = (e.location || '').toLowerCase();
      if (e.is_online || loc.includes('online')) return true;
      if (loc === '' || loc === 'london' || loc.includes('london')) return true;
      if (NON_LONDON_CITIES.some(city => loc.includes(city))) return false;
      return true;
    });

    return { events: parsedEvents };
  } catch (err) {
    return { events: [], error: `Source "${source.name}": ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

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
  const startTime = Date.now();
  const MAX_SCRAPE_TIME = 40000; // 40s for scraping, leaves 20s for DB inserts

  // Scrape all sources concurrently in large batches
  const BATCH_SIZE = 20;
  const allResults: { source: Source; events: ParsedEvent[]; error?: string }[] = [];

  for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    // Check if we're running out of time
    if (Date.now() - startTime > MAX_SCRAPE_TIME) {
      errors.push(`Time limit reached after ${Math.round((Date.now() - startTime) / 1000)}s — scraped ${i}/${sources.length} sources`);
      break;
    }

    const batch = sources.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (source) => {
        const result = await scrapeSource(source);
        return { source, ...result };
      })
    );
    allResults.push(...results);
  }

  // Insert events into DB
  for (const { source, events: parsedEvents, error: scrapeError } of allResults) {
    if (scrapeError) {
      errors.push(scrapeError);
      continue;
    }

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

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const SHORT_MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const ALL_MONTHS = `${MONTHS}|${SHORT_MONTHS}`;

function parseFlexibleDate(dateStr: string): string | null {
  try {
    // Try native parse first (handles ISO dates, RFC dates etc.)
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2020) return d.toISOString();

    // UK format: "25 March 2026" or "25 Mar 2026"
    const ukMatch = dateStr.match(new RegExp(`(\\d{1,2})\\s+(${ALL_MONTHS})\\s+(\\d{4})`, 'i'));
    if (ukMatch) {
      const d2 = new Date(`${ukMatch[2]} ${ukMatch[1]}, ${ukMatch[3]}`);
      if (!isNaN(d2.getTime())) return d2.toISOString();
    }

    // US format: "March 25, 2026" or "Mar 25, 2026"
    const usMatch = dateStr.match(new RegExp(`(${ALL_MONTHS})\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'i'));
    if (usMatch) {
      const d3 = new Date(`${usMatch[1]} ${usMatch[2]}, ${usMatch[3]}`);
      if (!isNaN(d3.getTime())) return d3.toISOString();
    }

    // UK short: "25/03/2026" or "25-03-2026" (day/month/year)
    const ukShort = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ukShort) {
      const d4 = new Date(`${ukShort[3]}-${ukShort[2].padStart(2, '0')}-${ukShort[1].padStart(2, '0')}`);
      if (!isNaN(d4.getTime()) && d4.getFullYear() > 2020) return d4.toISOString();
    }

    // Day Month (no year, assume current/next): "25 March" or "Wed 25 Mar"
    const noYear = dateStr.match(new RegExp(`(\\d{1,2})\\s+(${ALL_MONTHS})`, 'i'));
    if (noYear) {
      const now = new Date();
      let year = now.getFullYear();
      const d5 = new Date(`${noYear[2]} ${noYear[1]}, ${year}`);
      if (!isNaN(d5.getTime())) {
        if (d5 < now) {
          d5.setFullYear(year + 1);
        }
        return d5.toISOString();
      }
    }

    return null;
  } catch {
    return null;
  }
}
