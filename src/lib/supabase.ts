import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

/** Returns true when Supabase env vars are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ---------------------------------------------------------------------------
// Domain types — PodTrackr: corporate parenthood initiatives
// ---------------------------------------------------------------------------

export type InitiativeStatus = 'planned' | 'piloting' | 'active' | 'paused' | 'retired';

export const STATUSES: InitiativeStatus[] = [
  'planned',
  'piloting',
  'active',
  'paused',
  'retired',
];

export type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
};

export type Company = {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  headquarters: string | null;
  website: string | null;
  color: string;
};

export type Initiative = {
  id: string;
  company_id: string;
  category_slug: string;
  title: string;
  description: string | null;
  status: InitiativeStatus;
  /** Weeks of leave, when the initiative is a leave policy. */
  leave_weeks: number | null;
  /** Whether the policy is gender-neutral / equal for all parents. */
  gender_neutral: boolean;
  /** Whether the benefit is fully paid. */
  is_paid: boolean;
  /** One-off / annual stipend amount in the given currency, if any. */
  stipend_amount: number | null;
  currency: string;
  /** ISO date the initiative launched or is planned to launch. */
  start_date: string | null;
  source_url: string | null;
  created_at: string;
  // Joined / derived
  company?: Company;
  category?: Category;
};

/** The full catalog payload served by the API. */
export type Catalog = {
  companies: Company[];
  categories: Category[];
  initiatives: Initiative[];
  source: 'supabase' | 'demo';
};
