import { supabase } from './supabase';
import type { Source } from './supabase';

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

// Match event text against interest keywords — returns matching interest slugs
export function matchInterests(title: string, description: string | null): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  const matched: string[] = [];

  for (const [slug, keywords] of Object.entries(INTEREST_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      matched.push(slug);
    }
  }

  // Default to 'public-speaking' if nothing matched (it's an event after all)
  if (matched.length === 0) matched.push('public-speaking');
  return matched;
}

// Parse RSS feed (for WordPress sites like UKCLA)
async function scrapeRSS(source: Source): Promise<ParsedEvent[]> {
  const config = source.scrape_config as { feed_url: string; event_keywords?: string[] };
  const feedUrl = config.feed_url;

  const response = await fetch(feedUrl);
  const xml = await response.text();

  // Simple XML parsing without heavy dependencies
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

    events.push({
      title: decodeHTML(title),
      description: description ? decodeHTML(stripHTML(description)).slice(0, 500) : null,
      date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      location: 'London',
      url: link.trim(),
      is_free: true,
      is_online: false,
      external_id: link.trim(),
    });
  }

  return events;
}

// Parse HTML events pages (for MCA, Fabians)
async function scrapeHTML(source: Source): Promise<ParsedEvent[]> {
  const config = source.scrape_config as {
    events_url: string;
    selectors: Record<string, string>;
  };

  const response = await fetch(config.events_url);
  const html = await response.text();
  const events: ParsedEvent[] = [];

  // Extract event blocks using regex patterns matching common event page structures
  // This avoids needing a full DOM parser on the server
  const eventBlocks = extractEventBlocks(html, source.name);

  for (const block of eventBlocks) {
    if (block.title && block.url) {
      events.push({
        title: decodeHTML(block.title),
        description: block.description ? decodeHTML(block.description).slice(0, 500) : null,
        date: block.date ? parseFlexibleDate(block.date) : new Date().toISOString(),
        end_date: block.end_date || null,
        location: block.location || 'London',
        url: block.url.startsWith('http') ? block.url : `${source.url}${block.url}`,
        is_free: block.is_free ?? false,
        is_online: block.is_online ?? false,
        external_id: block.url,
      });
    }
  }

  return events;
}

// Extract event blocks from HTML using source-specific patterns
function extractEventBlocks(html: string, sourceName: string): RawEventBlock[] {
  const blocks: RawEventBlock[] = [];

  if (sourceName.includes('MCA') || sourceName.includes('Management')) {
    // MCA uses structured event cards with clear patterns
    const eventPattern = /<a[^>]*href="(\/event\/[^"]*)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>[\s\S]*?(?:<time[^>]*>([\s\S]*?)<\/time>|(\d{1,2}\s+\w+\s+\d{4}))/gi;
    let match: RegExpExecArray | null;
    while ((match = eventPattern.exec(html)) !== null) {
      const title = stripHTML(match[2]).trim();
      const dateStr = stripHTML(match[3] || match[4] || '').trim();
      blocks.push({
        title,
        url: match[1],
        date: dateStr,
        description: null,
        location: 'London',
        is_free: html.includes('Free') || false,
        is_online: title.toLowerCase().includes('online'),
      });
    }

    // Fallback: find event links more broadly
    if (blocks.length === 0) {
      const linkPattern = /<a[^>]*href="(\/event\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      let fallbackMatch: RegExpExecArray | null;
      while ((fallbackMatch = linkPattern.exec(html)) !== null) {
        const title = stripHTML(fallbackMatch[2]).trim();
        if (title.length > 5 && !blocks.find(b => b.url === fallbackMatch![1])) {
          blocks.push({ title, url: fallbackMatch[1], date: null, description: null, location: 'London' });
        }
      }
    }
  }

  if (sourceName.includes('Fabian')) {
    // Fabians typically use WordPress event plugins
    const eventPattern = /<a[^>]*href="([^"]*event[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const seen = new Set<string>();
    while ((match = eventPattern.exec(html)) !== null) {
      const url = match[1];
      const title = stripHTML(match[2]).trim();
      if (title.length > 5 && !seen.has(url)) {
        seen.add(url);
        blocks.push({ title, url, date: null, description: null, location: 'London' });
      }
    }
  }

  return blocks;
}

// API-based scraping (for TicketTailor / Pints of Knowledge)
async function scrapeAPI(source: Source): Promise<ParsedEvent[]> {
  // TicketTailor has a public events page; we try to fetch it
  const config = source.scrape_config as { ticket_url: string; fallback_url: string };

  try {
    const response = await fetch(config.ticket_url, {
      headers: { 'User-Agent': 'EventRadar/1.0' },
      redirect: 'follow',
    });
    if (response.ok) {
      const html = await response.text();
      return extractTicketTailorEvents(html, source.url);
    }
  } catch {
    // Fallback to the main site
  }

  // Return empty - Pints of Knowledge events will need manual addition or
  // periodic checking via the fallback URL
  return [];
}

function extractTicketTailorEvents(html: string, baseUrl: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const eventPattern = /<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let match;
  while ((match = eventPattern.exec(html)) !== null) {
    events.push({
      title: stripHTML(match[2]).trim(),
      url: match[1].startsWith('http') ? match[1] : `${baseUrl}${match[1]}`,
      date: new Date().toISOString(),
      description: 'Pub-based talk by experts. Check the link for details.',
      location: 'London (pub venue TBC)',
      is_free: false,
      is_online: false,
      external_id: match[1],
    });
  }
  return events;
}

// Main scrape function: scrape all sources and upsert into Supabase
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

      // Filter London-only events
      parsedEvents = parsedEvents.filter(e => {
        const loc = (e.location || '').toLowerCase();
        return loc.includes('london') || loc === '' || e.is_online;
      });

      for (const event of parsedEvents) {
        // Upsert event
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
          // Auto-tag with interests based on keywords
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

      // Update last scraped timestamp
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
  date: string;
  end_date?: string | null;
  location: string | null;
  url: string;
  is_free?: boolean;
  is_online?: boolean;
  external_id?: string;
};

type RawEventBlock = {
  title: string;
  url: string;
  date: string | null;
  description: string | null;
  location?: string;
  end_date?: string;
  is_free?: boolean;
  is_online?: boolean;
};

function extractXML(xml: string, tag: string): string | null {
  // Handle CDATA sections
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
    .replace(/&#8211;/g, '–');
}

function parseFlexibleDate(dateStr: string): string {
  try {
    // Try standard date parsing first
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();

    // Try "25 March 2026" format
    const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (match) {
      const d2 = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
      if (!isNaN(d2.getTime())) return d2.toISOString();
    }

    return new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}
