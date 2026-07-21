import { NextResponse } from 'next/server';
import { loadCatalog, createInitiative, type NewInitiativeInput } from '@/lib/catalog';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/catalog — companies, categories and initiatives in one payload.
export async function GET() {
  const catalog = await loadCatalog();
  return NextResponse.json(catalog);
}

// POST /api/catalog — create a new initiative (optionally with a new company).
// When Supabase is not configured, the client persists locally instead; this
// endpoint reports that so the client can proceed in demo mode.
export async function POST(request: Request) {
  let body: NewInitiativeInput;
  try {
    body = (await request.json()) as NewInitiativeInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.title?.trim()) {
    return NextResponse.json({ error: 'A title is required' }, { status: 400 });
  }
  if (!body?.category_slug) {
    return NextResponse.json({ error: 'A category is required' }, { status: 400 });
  }
  if (!body.company_id && !body.new_company?.name?.trim()) {
    return NextResponse.json({ error: 'A company is required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ persisted: false, source: 'demo' });
  }

  try {
    const result = await createInitiative(body);
    return NextResponse.json({ persisted: true, source: 'supabase', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create initiative';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
