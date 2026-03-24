-- EventRadar Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Sources: the organizations we scrape events from
CREATE TABLE IF NOT EXISTS sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  scrape_type TEXT NOT NULL CHECK (scrape_type IN ('rss', 'html', 'api', 'eventbrite', 'ics')),
  scrape_config JSONB DEFAULT '{}',
  category TEXT DEFAULT 'general',
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
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
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
CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON events(latitude, longitude);

-- Seed: Sources
-- Category A: Think Tanks & Policy
INSERT INTO sources (name, url, scrape_type, scrape_config, category) VALUES
  ('UK Constitutional Law Association', 'https://ukconstitutionallaw.org', 'rss', '{"feed_url": "https://ukconstitutionallaw.org/feed/", "event_keywords": ["seminar", "lecture", "conference", "workshop", "event", "roundtable"]}', 'legal-constitutional'),
  ('Fabian Society', 'https://fabians.org.uk', 'html', '{"events_url": "https://fabians.org.uk/events/", "selectors": {"list": "article.event, .event-item, .type-tribe_events", "title": "h2 a, .event-title", "date": "time, .event-date", "link": "a[href*=event]", "description": ".event-excerpt, .event-description"}}', 'think-tank'),
  ('Pints of Knowledge', 'https://www.pintsofknowledge.co.uk', 'api', '{"ticket_url": "https://www.tickettailor.com/events/pintsofknowledge", "fallback_url": "https://www.pintsofknowledge.co.uk/"}', 'casual-intellectual'),
  ('Management Consultancies Association', 'https://www.mca.org.uk', 'html', '{"events_url": "https://www.mca.org.uk/events", "selectors": {"list": ".event-card, .event-item, article", "title": "h3, h2, .event-title", "date": "time, .event-date, .date", "link": "a[href*=event]", "location": ".event-location, .location", "description": ".event-description, .excerpt"}}', 'consulting'),
  ('IPPR', 'https://www.ippr.org', 'html', '{"events_url": "https://www.ippr.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'think-tank'),
  ('Resolution Foundation', 'https://www.resolutionfoundation.org', 'html', '{"events_url": "https://www.resolutionfoundation.org/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'think-tank'),
  ('Institute for Government', 'https://www.instituteforgovernment.org.uk', 'html', '{"events_url": "https://www.instituteforgovernment.org.uk/our-events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'think-tank'),
  ('Demos', 'https://demos.co.uk', 'html', '{"events_url": "https://demos.co.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'think-tank'),
  ('Social Market Foundation', 'https://www.smf.co.uk', 'html', '{"events_url": "https://www.smf.co.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'think-tank'),
  ('Chatham House', 'https://www.chathamhouse.org', 'rss', '{"feed_url": "https://www.chathamhouse.org/rss/events", "event_keywords": []}', 'international-affairs'),
  ('UK in a Changing Europe', 'https://ukandeu.ac.uk', 'html', '{"events_url": "https://ukandeu.ac.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'think-tank'),
  ('New Economics Foundation', 'https://neweconomics.org', 'html', '{"events_url": "https://neweconomics.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'think-tank')
ON CONFLICT (name) DO NOTHING;

-- Category B: Legal & Constitutional
INSERT INTO sources (name, url, scrape_type, scrape_config, category) VALUES
  ('UCL Constitution Unit', 'https://www.ucl.ac.uk/constitution-unit', 'html', '{"events_url": "https://www.ucl.ac.uk/constitution-unit/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'legal-constitutional'),
  ('JUSTICE', 'https://justice.org.uk', 'html', '{"events_url": "https://justice.org.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'legal-constitutional'),
  ('Bingham Centre for the Rule of Law', 'https://bfrencelaw.org', 'html', '{"events_url": "https://www.biicl.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'legal-constitutional')
ON CONFLICT (name) DO NOTHING;

-- Category C: Public Intellectual Events & Lecture Series
INSERT INTO sources (name, url, scrape_type, scrape_config, category) VALUES
  ('Gresham College', 'https://www.gresham.ac.uk', 'html', '{"events_url": "https://www.gresham.ac.uk/whats-on", "selectors": {"link": "a[href*=lecture], a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'lectures'),
  ('Intelligence Squared', 'https://www.intelligencesquared.com', 'html', '{"events_url": "https://www.intelligencesquared.com/attend/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'lectures'),
  ('RSA', 'https://www.thersa.org', 'html', '{"events_url": "https://www.thersa.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'lectures'),
  ('How To Academy', 'https://howtoacademy.com', 'html', '{"events_url": "https://howtoacademy.com/events-calendar/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'lectures'),
  ('5x15', 'https://www.5x15.com', 'html', '{"events_url": "https://www.5x15.com/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'lectures'),
  ('The British Academy', 'https://www.thebritishacademy.ac.uk', 'html', '{"events_url": "https://www.thebritishacademy.ac.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'lectures'),
  ('Conway Hall', 'https://www.conwayhall.org.uk', 'html', '{"events_url": "https://www.conwayhall.org.uk/talks/", "selectors": {"link": "a[href*=talk], a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'lectures'),
  ('Prospect Magazine', 'https://www.prospectmagazine.co.uk', 'html', '{"events_url": "https://www.prospectmagazine.co.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'lectures'),
  ('London Review Bookshop', 'https://www.londonreviewbookshop.co.uk', 'html', '{"events_url": "https://www.londonreviewbookshop.co.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'lectures'),
  ('Southbank Centre', 'https://www.southbankcentre.co.uk', 'html', '{"events_url": "https://www.southbankcentre.co.uk/whats-on/talks-debates", "selectors": {"link": "a[href*=event], a[href*=whats-on]", "title": "h2, h3", "date": "time, .date"}}', 'lectures')
ON CONFLICT (name) DO NOTHING;

-- Category D: University Public Lectures
INSERT INTO sources (name, url, scrape_type, scrape_config, category) VALUES
  ('LSE Public Events', 'https://www.lse.ac.uk', 'html', '{"events_url": "https://www.lse.ac.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'university'),
  ('UCL Public Events', 'https://www.ucl.ac.uk', 'html', '{"events_url": "https://www.ucl.ac.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'university'),
  ('Kings College London Events', 'https://www.kcl.ac.uk', 'html', '{"events_url": "https://www.kcl.ac.uk/events/events-calendar", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'university')
ON CONFLICT (name) DO NOTHING;

-- Category E: Casual / Pub-based / Science Communication
INSERT INTO sources (name, url, scrape_type, scrape_config, category) VALUES
  ('Skeptics in the Pub', 'https://www.skepticsinthepub.org', 'html', '{"events_url": "https://www.skepticsinthepub.org/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'casual-intellectual'),
  ('Nerd Nite London', 'https://london.nerdnite.com', 'html', '{"events_url": "https://london.nerdnite.com/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'casual-intellectual'),
  ('Pint of Science', 'https://pintofscience.co.uk', 'html', '{"events_url": "https://pintofscience.co.uk/events/london/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'casual-intellectual'),
  ('Royal Institution', 'https://www.rigb.org', 'html', '{"events_url": "https://www.rigb.org/whats-on", "selectors": {"link": "a[href*=event], a[href*=whats-on]", "title": "h2, h3", "date": "time, .date"}}', 'casual-intellectual'),
  ('PubSci', 'https://pubsci.info', 'html', '{"events_url": "https://pubsci.info/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'casual-intellectual')
ON CONFLICT (name) DO NOTHING;

-- Category F: Debating & Political Discussion
INSERT INTO sources (name, url, scrape_type, scrape_config, category) VALUES
  ('Debate London', 'https://www.debate.london', 'html', '{"events_url": "https://www.debate.london/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'debate')
ON CONFLICT (name) DO NOTHING;

-- Category G: Economics & Fiscal Policy
INSERT INTO sources (name, url, scrape_type, scrape_config, category) VALUES
  ('Institute for Fiscal Studies', 'https://ifs.org.uk', 'html', '{"events_url": "https://ifs.org.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'economics'),
  ('NIESR', 'https://www.niesr.ac.uk', 'html', '{"events_url": "https://www.niesr.ac.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'economics')
ON CONFLICT (name) DO NOTHING;

-- Category H: International Affairs & Security
INSERT INTO sources (name, url, scrape_type, scrape_config, category) VALUES
  ('RUSI', 'https://rusi.org', 'html', '{"events_url": "https://rusi.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}', 'international-affairs')
ON CONFLICT (name) DO NOTHING;

-- Category I: Aggregators
INSERT INTO sources (name, url, scrape_type, scrape_config, category) VALUES
  ('Smart Thinking', 'https://smartthinking.org.uk', 'rss', '{"feed_url": "https://smartthinking.org.uk/feed/", "event_keywords": []}', 'aggregator'),
  ('Lectures London', 'https://lectures.london', 'html', '{"events_url": "https://lectures.london/", "selectors": {"link": "a[href*=event], a[href*=lecture]", "title": "h2, h3", "date": "time, .date"}}', 'aggregator')
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
  ('Health & Public Services', 'health-services', '#e11d48', 'heart-pulse'),
  ('Economics & Fiscal', 'economics-fiscal', '#ca8a04', 'trending-up'),
  ('International Affairs', 'international-affairs', '#059669', 'globe')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS (Row Level Security) - open for now since single-user
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_actions ENABLE ROW LEVEL SECURITY;

-- Saved addresses for travel time feature
CREATE TABLE IF NOT EXISTS saved_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_addresses_default ON saved_addresses(is_default);

ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

-- Policies: allow all for anon (single-user app)
CREATE POLICY "Allow all on sources" ON sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interests" ON interests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on event_interests" ON event_interests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on event_actions" ON event_actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on saved_addresses" ON saved_addresses FOR ALL USING (true) WITH CHECK (true);
