import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Convenience alias
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type Source = {
  id: string;
  name: string;
  url: string;
  scrape_type: 'rss' | 'html' | 'api';
  scrape_config: Record<string, unknown>;
  enabled: boolean;
  last_scraped_at: string | null;
};

export type Interest = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
};

export type Event = {
  id: string;
  source_id: string;
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  location: string | null;
  city: string;
  url: string;
  image_url: string | null;
  is_free: boolean;
  is_online: boolean;
  external_id: string | null;
  created_at: string;
  source?: Source;
  interests?: Interest[];
  action?: 'saved' | 'hidden' | null;
};
