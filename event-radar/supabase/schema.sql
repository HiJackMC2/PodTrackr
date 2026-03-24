-- EventRadar Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Sources: the organizations we scrape events from
CREATE TABLE IF NOT EXISTS sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  scrape_type TEXT NOT NULL CHECK (scrape_type IN ('rss', 'html', 'api')),
  scrape_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Interest tags that events can be categorized under
CREATE TABLE IF NOT EXISTS interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT DEFAULT 'tag',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events scraped from sources
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  city TEXT DEFAULT 'London',
  url TEXT NOT NULL,
  image_url TEXT,
  is_free BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, external_id)
);

-- Junction table: events <-> interests
CREATE TABLE IF NOT EXISTS event_interests (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES interests(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, interest_id)
);

-- User event actions (saved / hidden)
CREATE TABLE IF NOT EXISTS event_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('saved', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, action)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source_id);
CREATE INDEX IF NOT EXISTS idx_event_actions_action ON event_actions(action);

-- Seed: Sources
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('UK Constitutional Law Association', 'https://ukconstitutionallaw.org', 'rss', '{"feed_url": "https://ukconstitutionallaw.org/feed/", "event_keywords": ["seminar", "lecture", "conference", "workshop", "event", "roundtable"]}'),
  ('Fabian Society', 'https://fabians.org.uk', 'html', '{"events_url": "https://fabians.org.uk/events/", "selectors": {"list": "article.event, .event-item, .type-tribe_events", "title": "h2 a, .event-title", "date": "time, .event-date", "link": "a[href*=event]", "description": ".event-excerpt, .event-description"}}'),
  ('Pints of Knowledge', 'https://www.pintsofknowledge.co.uk', 'api', '{"ticket_url": "https://www.tickettailor.com/events/pintsofknowledge", "fallback_url": "https://www.pintsofknowledge.co.uk/"}'),
  ('Management Consultancies Association', 'https://www.mca.org.uk', 'html', '{"events_url": "https://www.mca.org.uk/events", "selectors": {"list": ".event-card, .event-item, article", "title": "h3, h2, .event-title", "date": "time, .event-date, .date", "link": "a[href*=event]", "location": ".event-location, .location", "description": ".event-description, .excerpt"}}')
ON CONFLICT (name) DO NOTHING;

-- Seed: Interests
INSERT INTO interests (name, slug, color, icon) VALUES
  ('Constitutional Law', 'constitutional-law', '#dc2626', 'scale'),
  ('Policy & Politics', 'policy-politics', '#2563eb', 'landmark'),
  ('Science & Research', 'science-research', '#16a34a', 'flask-conical'),
  ('Management & Consulting', 'management-consulting', '#9333ea', 'briefcase'),
  ('Public Speaking & Talks', 'public-speaking', '#ea580c', 'mic'),
  ('Social & Networking', 'social-networking', '#0891b2', 'users'),
  ('Technology & AI', 'technology-ai', '#4f46e5', 'cpu'),
  ('Health & Public Services', 'health-services', '#e11d48', 'heart-pulse')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS (Row Level Security) - open for now since single-user
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_actions ENABLE ROW LEVEL SECURITY;

-- Policies: allow all for anon (single-user app)
CREATE POLICY "Allow all on sources" ON sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interests" ON interests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on event_interests" ON event_interests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on event_actions" ON event_actions FOR ALL USING (true) WITH CHECK (true);
