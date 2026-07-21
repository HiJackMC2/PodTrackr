import { getSupabase, isSupabaseConfigured } from './supabase';
import type { Catalog, Company, Category, Initiative, InitiativeStatus } from './supabase';
import { demoCatalog } from './demo-data';

/**
 * Load the full catalog. Uses Supabase when configured, otherwise falls back to
 * the bundled demo dataset so the app is fully usable out of the box.
 */
export async function loadCatalog(): Promise<Catalog> {
  if (!isSupabaseConfigured()) return demoCatalog();

  try {
    const sb = getSupabase();
    const [companiesRes, categoriesRes, initiativesRes] = await Promise.all([
      sb.from('companies').select('*').order('name'),
      sb.from('categories').select('*').order('name'),
      sb.from('initiatives').select('*').order('created_at', { ascending: false }),
    ]);

    if (companiesRes.error || categoriesRes.error || initiativesRes.error) {
      throw companiesRes.error || categoriesRes.error || initiativesRes.error;
    }

    return {
      companies: (companiesRes.data as Company[]) || [],
      categories: (categoriesRes.data as Category[]) || [],
      initiatives: (initiativesRes.data as Initiative[]) || [],
      source: 'supabase',
    };
  } catch {
    // Any connectivity / schema error: degrade gracefully to demo data.
    return demoCatalog();
  }
}

export type NewInitiativeInput = {
  company_id?: string;
  new_company?: { name: string; industry?: string; size?: string; headquarters?: string; website?: string };
  category_slug: string;
  title: string;
  description?: string;
  status: InitiativeStatus;
  leave_weeks?: number | null;
  gender_neutral?: boolean;
  is_paid?: boolean;
  stipend_amount?: number | null;
  currency?: string;
  start_date?: string | null;
  source_url?: string | null;
};

const PALETTE = ['#6366f1', '#0891b2', '#db2777', '#16a34a', '#ea580c', '#9333ea', '#ca8a04', '#0d9488', '#dc2626', '#2563eb'];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/**
 * Persist a new initiative (and optionally a new company) to Supabase.
 * Returns the created initiative plus any newly created company, so the client
 * can merge them. When Supabase is not configured the client persists locally
 * instead, so this is only reached in backed mode.
 */
export async function createInitiative(
  input: NewInitiativeInput
): Promise<{ initiative: Initiative; company?: Company }> {
  const sb = getSupabase();
  let companyId = input.company_id;
  let createdCompany: Company | undefined;

  if (!companyId && input.new_company?.name) {
    const { data, error } = await sb
      .from('companies')
      .insert({
        name: input.new_company.name,
        industry: input.new_company.industry ?? null,
        size: input.new_company.size ?? null,
        headquarters: input.new_company.headquarters ?? null,
        website: input.new_company.website ?? null,
        color: colorFor(input.new_company.name),
      })
      .select()
      .single();
    if (error) throw error;
    createdCompany = data as Company;
    companyId = createdCompany.id;
  }

  if (!companyId) throw new Error('A company is required');

  const { data, error } = await sb
    .from('initiatives')
    .insert({
      company_id: companyId,
      category_slug: input.category_slug,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      leave_weeks: input.leave_weeks ?? null,
      gender_neutral: input.gender_neutral ?? false,
      is_paid: input.is_paid ?? true,
      stipend_amount: input.stipend_amount ?? null,
      currency: input.currency ?? 'USD',
      start_date: input.start_date ?? null,
      source_url: input.source_url ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  return { initiative: data as Initiative, company: createdCompany };
}
