-- PodTrackr Database Schema
-- Corporate parenthood initiatives tracker.
-- Run this in your Supabase SQL editor to set up the database.
-- The app runs on bundled demo data when these tables/env vars are absent,
-- so Supabase is optional — set it up to persist your own data.

-- Categories of parenthood initiatives
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT DEFAULT 'baby',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Companies whose initiatives we track
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  industry TEXT,
  size TEXT,
  headquarters TEXT,
  website TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parenthood initiatives offered by companies
CREATE TABLE IF NOT EXISTS initiatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES categories(slug),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('planned', 'piloting', 'active', 'paused', 'retired')),
  leave_weeks NUMERIC,
  gender_neutral BOOLEAN DEFAULT false,
  is_paid BOOLEAN DEFAULT true,
  stipend_amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  start_date DATE,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_initiatives_company ON initiatives(company_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_category ON initiatives(category_slug);
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON initiatives(status);

-- Seed: categories
INSERT INTO categories (name, slug, color, icon) VALUES
  ('Parental Leave', 'parental-leave', '#6366f1', 'baby'),
  ('Childcare Support', 'childcare', '#0891b2', 'building-2'),
  ('Fertility & Family Forming', 'fertility', '#db2777', 'heart'),
  ('Flexible Work', 'flexible-work', '#16a34a', 'clock'),
  ('Return to Work', 'return-to-work', '#ea580c', 'briefcase'),
  ('Nursing & Wellbeing', 'wellbeing', '#9333ea', 'milk'),
  ('Financial Support', 'financial', '#ca8a04', 'gift'),
  ('Community & ERGs', 'community', '#0d9488', 'users')
ON CONFLICT (slug) DO NOTHING;

-- Seed: companies
INSERT INTO companies (name, industry, size, headquarters, website, color) VALUES
  ('Patagonia', 'Retail', '1,000–5,000', 'Ventura, CA', 'https://www.patagonia.com', '#1d4ed8'),
  ('Netflix', 'Media & Streaming', '10,000+', 'Los Gatos, CA', 'https://www.netflix.com', '#dc2626'),
  ('Microsoft', 'Technology', '10,000+', 'Redmond, WA', 'https://www.microsoft.com', '#0ea5e9'),
  ('Etsy', 'E-commerce', '1,000–5,000', 'Brooklyn, NY', 'https://www.etsy.com', '#ea580c'),
  ('Salesforce', 'Technology', '10,000+', 'San Francisco, CA', 'https://www.salesforce.com', '#2563eb'),
  ('Spotify', 'Media & Streaming', '5,000–10,000', 'Stockholm, SE', 'https://www.spotify.com', '#16a34a'),
  ('Unilever', 'Consumer Goods', '10,000+', 'London, UK', 'https://www.unilever.com', '#0d9488'),
  ('Adobe', 'Technology', '10,000+', 'San Jose, CA', 'https://www.adobe.com', '#db2777')
ON CONFLICT (name) DO NOTHING;

-- Seed: a starter set of initiatives (mirrors the bundled demo data)
INSERT INTO initiatives (company_id, category_slug, title, description, status, leave_weeks, gender_neutral, is_paid, stipend_amount, currency, start_date, source_url)
SELECT c.id, v.category_slug, v.title, v.description, v.status, v.leave_weeks, v.gender_neutral, v.is_paid, v.stipend_amount, v.currency, v.start_date::date, v.source_url
FROM (VALUES
  ('Patagonia', 'childcare', 'On-site child development centers', 'Company-run childcare at HQ and the distribution center, credited with ~100% maternal return-to-work.', 'active', NULL::numeric, true, true, NULL::numeric, 'USD', '1983-09-01', 'https://www.patagonia.com'),
  ('Patagonia', 'parental-leave', '16 weeks fully paid parental leave', 'All new parents receive 16 weeks of paid leave regardless of gender or path to parenthood.', 'active', 16, true, true, NULL, 'USD', '2015-01-01', 'https://www.patagonia.com'),
  ('Netflix', 'parental-leave', 'Flexible first-year parental leave', 'Salaried employees take leave flexibly across the first year after birth or adoption.', 'active', 52, true, true, NULL, 'USD', '2015-08-01', 'https://www.netflix.com'),
  ('Microsoft', 'parental-leave', '20 weeks paid maternity / 12 weeks paid parental', 'Birthing parents receive 20 weeks fully paid; all parents receive 12 additional weeks of paid parental leave.', 'active', 20, false, true, NULL, 'USD', '2015-11-01', 'https://www.microsoft.com'),
  ('Microsoft', 'return-to-work', 'Phased "ramp back" return', 'Reduced hours at full pay for the first four weeks back from parental leave.', 'active', NULL, true, true, NULL, 'USD', '2019-03-01', 'https://www.microsoft.com'),
  ('Etsy', 'parental-leave', '26 weeks gender-neutral parental leave', 'Every new parent gets 26 weeks fully paid, taken any time in the first two years.', 'active', 26, true, true, NULL, 'USD', '2016-04-01', 'https://www.etsy.com'),
  ('Salesforce', 'fertility', 'Fertility & adoption reimbursement', 'Up to $10,000 toward fertility treatment and up to $10,000 in adoption assistance per child.', 'active', NULL, true, true, 10000, 'USD', '2018-06-01', 'https://www.salesforce.com'),
  ('Salesforce', 'childcare', 'Backup childcare days', 'Subsidised backup care for up to 25 days per year.', 'active', NULL, true, true, NULL, 'USD', '2020-01-01', 'https://www.salesforce.com'),
  ('Spotify', 'parental-leave', '6 months paid parental leave', 'Global standard of six months paid leave for all parents plus a flexible welcome-back month.', 'active', 26, true, true, NULL, 'USD', '2015-11-01', 'https://www.spotify.com'),
  ('Spotify', 'flexible-work', 'Work From Anywhere for parents', 'Employees choose their work mode and location to balance caregiving.', 'active', NULL, true, true, NULL, 'USD', '2021-02-01', 'https://www.spotify.com'),
  ('Unilever', 'parental-leave', 'Global minimum 6-week paid parental leave', 'A worldwide floor of at least six weeks fully paid leave, rolling out across markets.', 'piloting', 6, true, true, NULL, 'GBP', '2024-06-01', 'https://www.unilever.com'),
  ('Unilever', 'wellbeing', 'Lactation rooms & shipping', 'Dedicated nursing rooms and free breast-milk shipping for parents travelling on business.', 'active', NULL, false, true, NULL, 'GBP', '2019-09-01', 'https://www.unilever.com'),
  ('Adobe', 'parental-leave', '16 weeks paid parental + 10 weeks medical', 'All parents get 16 weeks paid parental leave; birthing parents get 10 additional weeks of paid medical leave.', 'active', 16, true, true, NULL, 'USD', '2015-11-01', 'https://www.adobe.com'),
  ('Adobe', 'community', 'Parents & Caregivers ERG', 'Employee resource group offering peer support, workshops and a mentor network.', 'active', NULL, true, false, NULL, 'USD', '2017-05-01', 'https://www.adobe.com'),
  ('Etsy', 'financial', 'New-child stipend', 'A one-off payment to help cover the early costs of a new arrival.', 'planned', NULL, true, true, 2000, 'USD', '2025-01-01', 'https://www.etsy.com'),
  ('Netflix', 'fertility', 'Family-forming benefit', 'Coverage for fertility treatment, egg freezing, surrogacy and adoption.', 'active', NULL, true, true, 20000, 'USD', '2020-01-01', 'https://www.netflix.com'),
  ('Microsoft', 'flexible-work', 'Flexible & hybrid scheduling', 'Up to 50% remote work as standard, with flexible hours for caregiving.', 'active', NULL, true, true, NULL, 'USD', '2020-10-01', 'https://www.microsoft.com'),
  ('Salesforce', 'return-to-work', 'Returnship programme', 'A paid, structured re-entry path after an extended caregiving break.', 'piloting', NULL, true, true, NULL, 'USD', '2024-09-01', 'https://www.salesforce.com'),
  ('Patagonia', 'community', 'Parents-at-work network', 'Peer community, family events and paid time to volunteer at a child’s school.', 'active', NULL, true, false, NULL, 'USD', '2010-01-01', 'https://www.patagonia.com'),
  ('Spotify', 'wellbeing', 'Egg-freezing & fertility support', 'Reimbursement for egg freezing and fertility assistance.', 'active', NULL, false, true, 15000, 'USD', '2017-01-01', 'https://www.spotify.com'),
  ('Adobe', 'childcare', 'Childcare subsidy pilot', 'Means-tested monthly subsidy toward licensed childcare, piloting in three US locations.', 'piloting', NULL, true, true, 1200, 'USD', '2024-03-01', 'https://www.adobe.com'),
  ('Unilever', 'return-to-work', 'Keep-in-touch days', 'Up to 10 optional paid days during leave to stay connected and ease the return.', 'active', NULL, true, true, NULL, 'GBP', '2018-01-01', 'https://www.unilever.com')
) AS v(company_name, category_slug, title, description, status, leave_weeks, gender_neutral, is_paid, stipend_amount, currency, start_date, source_url)
JOIN companies c ON c.name = v.company_name
ON CONFLICT DO NOTHING;

-- Row Level Security (single-user app: open policies)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on companies" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on initiatives" ON initiatives FOR ALL USING (true) WITH CHECK (true);
