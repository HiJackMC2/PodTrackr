import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/events — fetch events with filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const interest = searchParams.get('interest');
  const saved = searchParams.get('saved') === 'true';
  const hidden = searchParams.get('hidden') === 'true';
  const unjudged = searchParams.get('unjudged') === 'true';
  const search = searchParams.get('search');
  const upcoming = searchParams.get('upcoming') === 'true';
  const days = parseInt(searchParams.get('days') || '30', 10);

  let query = supabase
    .from('events')
    .select(`
      *,
      source:sources(id, name, url, category),
      interests:event_interests(interest:interests(*)),
      actions:event_actions(action, created_at)
    `)
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true });

  // Filter by interest
  if (interest && interest !== 'all') {
    query = supabase
      .from('events')
      .select(`
        *,
        source:sources(id, name, url, category),
        interests:event_interests!inner(interest:interests!inner(*)),
        actions:event_actions(action, created_at)
      `)
      .eq('interests.interest.slug', interest)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true });
  }

  // For upcoming view, limit to N days
  if (upcoming) {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + days);
    query = query.lte('date', maxDate.toISOString());
  }

  const { data: events, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Post-process: flatten interests and actions
  let processed = (events || []).map(event => {
    const eventInterests = (event.interests || []).map(
      (ei: { interest: Record<string, unknown> }) => ei.interest
    );
    const actionEntry = event.actions?.[0];
    const action = actionEntry?.action || null;
    const actionDate = actionEntry?.created_at || null;
    return { ...event, interests: eventInterests, action, actionDate, actions: undefined };
  });

  // View modes
  if (hidden) {
    // Show only hidden events
    processed = processed.filter(e => e.action === 'hidden');
  } else if (saved || upcoming) {
    // Show only saved events
    processed = processed.filter(e => e.action === 'saved');
  } else if (unjudged) {
    // Show only events with no action
    processed = processed.filter(e => !e.action);
  } else {
    // Default: hide hidden events
    processed = processed.filter(e => e.action !== 'hidden');
  }

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    processed = processed.filter(
      e =>
        e.title.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q)
    );
  }

  return NextResponse.json(processed);
}

// PATCH /api/events — save or hide an event
export async function PATCH(request: NextRequest) {
  const { event_id, action } = await request.json();

  if (!event_id || !['saved', 'hidden'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Check if there's an existing action
  const { data: existing } = await supabase
    .from('event_actions')
    .select('*')
    .eq('event_id', event_id)
    .single();

  if (existing) {
    // If same action, remove it (toggle off)
    if (existing.action === action) {
      await supabase.from('event_actions').delete().eq('id', existing.id);
      return NextResponse.json({ action: null });
    }
    // Otherwise update to new action
    await supabase.from('event_actions').update({ action }).eq('id', existing.id);
    return NextResponse.json({ action });
  }

  // Create new action
  await supabase.from('event_actions').insert({ event_id, action });
  return NextResponse.json({ action });
}
