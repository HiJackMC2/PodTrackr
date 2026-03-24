-- EventRadar Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Sources: the organizations we scrape events from
CREATE TABLE IF NOT EXISTS sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  scrape_type TEXT NOT NULL CHECK (scrape_type IN ('rss', 'html', 'api', 'eventbrite', 'ics')),
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
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('UK Constitutional Law Association', 'https://ukconstitutionallaw.org', 'rss', '{"feed_url": "https://ukconstitutionallaw.org/feed/", "event_keywords": ["seminar", "lecture", "conference", "workshop", "event", "roundtable"]}'),
  ('Fabian Society', 'https://fabians.org.uk', 'html', '{"events_url": "https://fabians.org.uk/events/", "selectors": {"list": "article.event, .event-item, .type-tribe_events", "title": "h2 a, .event-title", "date": "time, .event-date", "link": "a[href*=event]", "description": ".event-excerpt, .event-description"}}'),
  ('Pints of Knowledge', 'https://www.pintsofknowledge.co.uk', 'api', '{"ticket_url": "https://www.tickettailor.com/events/pintsofknowledge", "fallback_url": "https://www.pintsofknowledge.co.uk/"}'),
  ('Management Consultancies Association', 'https://www.mca.org.uk', 'html', '{"events_url": "https://www.mca.org.uk/events", "selectors": {"list": ".event-card, .event-item, article", "title": "h3, h2, .event-title", "date": "time, .event-date, .date", "link": "a[href*=event]", "location": ".event-location, .location", "description": ".event-description, .excerpt"}}'),
  ('IPPR', 'https://www.ippr.org', 'html', '{"events_url": "https://www.ippr.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Resolution Foundation', 'https://www.resolutionfoundation.org', 'html', '{"events_url": "https://www.resolutionfoundation.org/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Institute for Government', 'https://www.instituteforgovernment.org.uk', 'html', '{"events_url": "https://www.instituteforgovernment.org.uk/our-events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Demos', 'https://demos.co.uk', 'html', '{"events_url": "https://demos.co.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Social Market Foundation', 'https://www.smf.co.uk', 'html', '{"events_url": "https://www.smf.co.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Chatham House', 'https://www.chathamhouse.org', 'rss', '{"feed_url": "https://www.chathamhouse.org/rss/events", "event_keywords": []}'),
  ('UK in a Changing Europe', 'https://ukandeu.ac.uk', 'html', '{"events_url": "https://ukandeu.ac.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('New Economics Foundation', 'https://neweconomics.org', 'html', '{"events_url": "https://neweconomics.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category B: Legal & Constitutional
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('UCL Constitution Unit', 'https://www.ucl.ac.uk/constitution-unit', 'html', '{"events_url": "https://www.ucl.ac.uk/constitution-unit/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('JUSTICE', 'https://justice.org.uk', 'html', '{"events_url": "https://justice.org.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Bingham Centre for the Rule of Law', 'https://bfrencelaw.org', 'html', '{"events_url": "https://www.biicl.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category C: Public Intellectual Events & Lecture Series
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Gresham College', 'https://www.gresham.ac.uk', 'html', '{"events_url": "https://www.gresham.ac.uk/whats-on", "selectors": {"link": "a[href*=lecture], a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Intelligence Squared', 'https://www.intelligencesquared.com', 'html', '{"events_url": "https://www.intelligencesquared.com/attend/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('RSA', 'https://www.thersa.org', 'html', '{"events_url": "https://www.thersa.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('How To Academy', 'https://howtoacademy.com', 'html', '{"events_url": "https://howtoacademy.com/events-calendar/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('5x15', 'https://www.5x15.com', 'html', '{"events_url": "https://www.5x15.com/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('The British Academy', 'https://www.thebritishacademy.ac.uk', 'html', '{"events_url": "https://www.thebritishacademy.ac.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Conway Hall', 'https://www.conwayhall.org.uk', 'html', '{"events_url": "https://www.conwayhall.org.uk/talks/", "selectors": {"link": "a[href*=talk], a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Prospect Magazine', 'https://www.prospectmagazine.co.uk', 'html', '{"events_url": "https://www.prospectmagazine.co.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('London Review Bookshop', 'https://www.londonreviewbookshop.co.uk', 'html', '{"events_url": "https://www.londonreviewbookshop.co.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Southbank Centre', 'https://www.southbankcentre.co.uk', 'html', '{"events_url": "https://www.southbankcentre.co.uk/whats-on/talks-debates", "selectors": {"link": "a[href*=event], a[href*=whats-on]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category D: University Public Lectures
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('LSE Public Events', 'https://www.lse.ac.uk', 'html', '{"events_url": "https://www.lse.ac.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('UCL Public Events', 'https://www.ucl.ac.uk', 'html', '{"events_url": "https://www.ucl.ac.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Kings College London Events', 'https://www.kcl.ac.uk', 'html', '{"events_url": "https://www.kcl.ac.uk/events/events-calendar", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category E: Casual / Pub-based / Science Communication
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Skeptics in the Pub', 'https://www.skepticsinthepub.org', 'html', '{"events_url": "https://www.skepticsinthepub.org/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Nerd Nite London', 'https://london.nerdnite.com', 'html', '{"events_url": "https://london.nerdnite.com/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Pint of Science', 'https://pintofscience.co.uk', 'html', '{"events_url": "https://pintofscience.co.uk/events/london/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Royal Institution', 'https://www.rigb.org', 'html', '{"events_url": "https://www.rigb.org/whats-on", "selectors": {"link": "a[href*=event], a[href*=whats-on]", "title": "h2, h3", "date": "time, .date"}}'),
  ('PubSci', 'https://pubsci.info', 'html', '{"events_url": "https://pubsci.info/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category F: Debating & Political Discussion
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Debate London', 'https://www.debate.london', 'html', '{"events_url": "https://www.debate.london/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category G: Economics & Fiscal Policy
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Institute for Fiscal Studies', 'https://ifs.org.uk', 'html', '{"events_url": "https://ifs.org.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('NIESR', 'https://www.niesr.ac.uk', 'html', '{"events_url": "https://www.niesr.ac.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category H: International Affairs & Security
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('RUSI', 'https://rusi.org', 'html', '{"events_url": "https://rusi.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category I: Aggregators
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Smart Thinking', 'https://smartthinking.org.uk', 'rss', '{"feed_url": "https://smartthinking.org.uk/feed/", "event_keywords": []}'),
  ('Lectures London', 'https://lectures.london', 'html', '{"events_url": "https://lectures.london/", "selectors": {"link": "a[href*=event], a[href*=lecture]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category J: Museums, Libraries & Cultural Institutions
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Wellcome Collection', 'https://wellcomecollection.org', 'html', '{"events_url": "https://wellcomecollection.org/events", "selectors": {"link": "a[href*=events]", "title": "h2, h3", "date": "time, .date"}}'),
  ('British Library', 'https://www.bl.uk', 'html', '{"events_url": "https://www.bl.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Barbican Centre', 'https://www.barbican.org.uk', 'html', '{"events_url": "https://www.barbican.org.uk/whats-on/talks-and-events", "selectors": {"link": "a[href*=whats-on]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Science Museum', 'https://www.sciencemuseum.org.uk', 'html', '{"events_url": "https://www.sciencemuseum.org.uk/see-and-do/events", "selectors": {"link": "a[href*=event], a[href*=see-and-do]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Natural History Museum', 'https://www.nhm.ac.uk', 'html', '{"events_url": "https://www.nhm.ac.uk/events.html", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('V&A', 'https://www.vam.ac.uk', 'html', '{"events_url": "https://www.vam.ac.uk/whatson", "selectors": {"link": "a[href*=whatson], a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category K: Additional Think Tanks
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Policy Exchange', 'https://policyexchange.org.uk', 'html', '{"events_url": "https://policyexchange.org.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Centre for Policy Studies', 'https://cps.org.uk', 'html', '{"events_url": "https://cps.org.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Adam Smith Institute', 'https://www.adamsmith.org', 'html', '{"events_url": "https://www.adamsmith.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Onward', 'https://www.ukonward.com', 'html', '{"events_url": "https://www.ukonward.com/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Reform', 'https://reform.uk', 'html', '{"events_url": "https://reform.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('The Kings Fund', 'https://www.kingsfund.org.uk', 'html', '{"events_url": "https://www.kingsfund.org.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Nuffield Trust', 'https://www.nuffieldtrust.org.uk', 'html', '{"events_url": "https://www.nuffieldtrust.org.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category L: Additional Academic / Learned Societies
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('The Royal Society', 'https://royalsociety.org', 'html', '{"events_url": "https://royalsociety.org/science-events-and-lectures/", "selectors": {"link": "a[href*=event], a[href*=lecture]", "title": "h2, h3", "date": "time, .date"}}'),
  ('SOAS University of London', 'https://www.soas.ac.uk', 'html', '{"events_url": "https://www.soas.ac.uk/about/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Imperial College London', 'https://www.imperial.ac.uk', 'html', '{"events_url": "https://www.imperial.ac.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Frontline Club', 'https://www.frontlineclub.com', 'html', '{"events_url": "https://www.frontlineclub.com/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Royal Geographic Society', 'https://www.rgs.org', 'html', '{"events_url": "https://www.rgs.org/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('London School of Hygiene', 'https://www.lshtm.ac.uk', 'html', '{"events_url": "https://www.lshtm.ac.uk/newsevents/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Goldsmiths University', 'https://www.gold.ac.uk', 'html', '{"events_url": "https://www.gold.ac.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category M: International Affairs & Foreign Policy
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('International Institute for Strategic Studies', 'https://www.iiss.org', 'html', '{"events_url": "https://www.iiss.org/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('European Council on Foreign Relations', 'https://ecfr.eu', 'html', '{"events_url": "https://ecfr.eu/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Overseas Development Institute', 'https://odi.org', 'html', '{"events_url": "https://odi.org/en/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category N: Health, Poverty & Social Policy
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Health Foundation', 'https://www.health.org.uk', 'html', '{"events_url": "https://www.health.org.uk/what-we-do/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Joseph Rowntree Foundation', 'https://www.jrf.org.uk', 'html', '{"events_url": "https://www.jrf.org.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Institute of Economic Affairs', 'https://iea.org.uk', 'html', '{"events_url": "https://iea.org.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category O: Science & Research Institutes
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Alan Turing Institute', 'https://www.turing.ac.uk', 'html', '{"events_url": "https://www.turing.ac.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Francis Crick Institute', 'https://www.crick.ac.uk', 'html', '{"events_url": "https://www.crick.ac.uk/whats-on/events", "selectors": {"link": "a[href*=event], a[href*=whats-on]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category P: Venues, Museums & Galleries
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Kings Place', 'https://www.kingsplace.co.uk', 'html', '{"events_url": "https://www.kingsplace.co.uk/whats-on/", "selectors": {"link": "a[href*=whats-on]", "title": "h2, h3", "date": "time, .date"}}'),
  ('London Library', 'https://www.londonlibrary.co.uk', 'html', '{"events_url": "https://www.londonlibrary.co.uk/whats-on/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('British Museum', 'https://www.britishmuseum.org', 'html', '{"events_url": "https://www.britishmuseum.org/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Tate Modern', 'https://www.tate.org.uk', 'html', '{"events_url": "https://www.tate.org.uk/whats-on?type=talks_and_lectures", "selectors": {"link": "a[href*=whats-on]", "title": "h2, h3", "date": "time, .date"}}'),
  ('National Gallery', 'https://www.nationalgallery.org.uk', 'html', '{"events_url": "https://www.nationalgallery.org.uk/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
ON CONFLICT (name) DO NOTHING;

-- Category Q: Additional Think Tanks & Policy
INSERT INTO sources (name, url, scrape_type, scrape_config) VALUES
  ('Centre for European Reform', 'https://www.cer.eu', 'html', '{"events_url": "https://www.cer.eu/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Ditchley Foundation', 'https://www.ditchley.com', 'html', '{"events_url": "https://www.ditchley.com/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Wilton Park', 'https://www.wiltonpark.org.uk', 'html', '{"events_url": "https://www.wiltonpark.org.uk/events/", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}'),
  ('Tony Blair Institute', 'https://www.institute.global', 'html', '{"events_url": "https://www.institute.global/events", "selectors": {"link": "a[href*=event]", "title": "h2, h3", "date": "time, .date"}}')
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
  ('International Affairs', 'international-affairs', '#059669')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS (Row Level Security) - open for now since single-user
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_actions ENABLE ROW LEVEL SECURITY;

-- Email log: track sent emails for idempotency
CREATE TABLE IF NOT EXISTS email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  events_included INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_type ON email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_sent ON email_log(sent_at);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on email_log" ON email_log FOR ALL USING (true) WITH CHECK (true);

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
