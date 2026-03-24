import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import {
  buildDailyDigestEmail,
  buildIntroEmail,
  type EventSummary,
  type SavedEvent,
} from '@/lib/email-templates';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://event-radar-rust.vercel.app';

// Helper: try to query email_log, return null if table doesn't exist
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryEmailLog(query: PromiseLike<{ data: any[] | null; error: any }>) {
  try {
    const result = await query;
    // If table doesn't exist, treat as empty
    if (result.error) return null;
    return result.data;
  } catch {
    return null;
  }
}

// POST /api/email — send daily digest or intro email
export async function POST(request: NextRequest) {
  // Verify cron secret if set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const type = (body as { type?: string }).type || 'daily';

  if (type === 'intro') {
    return sendIntroEmail();
  }

  return sendDailyDigest();
}

// GET handler for Vercel Cron compatibility
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Check if intro email has been sent yet
  const introLog = await queryEmailLog(
    supabase.from('email_log').select('id').eq('email_type', 'intro').limit(1)
  );

  if (!introLog || introLog.length === 0) {
    return sendIntroEmail();
  }

  return sendDailyDigest();
}

async function sendIntroEmail() {
  // Check if already sent (gracefully handle missing table)
  const existing = await queryEmailLog(
    supabase.from('email_log').select('id').eq('email_type', 'intro').limit(1)
  );

  if (existing && existing.length > 0) {
    return NextResponse.json({ message: 'Intro email already sent', skipped: true });
  }

  const { subject, html } = buildIntroEmail(APP_URL);
  const result = await sendEmail({ subject, html });

  if (result.success) {
    // Try to log, but don't fail if table doesn't exist
    await supabase.from('email_log').insert({
      email_type: 'intro',
      recipient: 'boynecross@gmail.com',
      subject,
      events_included: 0,
    });
  }

  return NextResponse.json({
    type: 'intro',
    ...result,
  });
}

async function sendDailyDigest() {
  // Check if already sent today (gracefully handle missing table)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sentToday = await queryEmailLog(
    supabase
      .from('email_log')
      .select('id')
      .eq('email_type', 'daily')
      .gte('sent_at', todayStart.toISOString())
      .limit(1)
  );

  if (sentToday && sentToday.length > 0) {
    return NextResponse.json({ message: 'Daily digest already sent today', skipped: true });
  }

  // Get last email sent date for "new since" cutoff
  const lastEmail = await queryEmailLog(
    supabase
      .from('email_log')
      .select('sent_at')
      .eq('email_type', 'daily')
      .order('sent_at', { ascending: false })
      .limit(1)
  );

  const sinceDate = (lastEmail?.[0] as { sent_at?: string } | undefined)?.sent_at
    || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Fetch new events since last email
  const { data: newEventsRaw } = await supabase
    .from('events')
    .select(`
      *,
      source:sources(name),
      interests:event_interests(interest:interests(name)),
      actions:event_actions(action)
    `)
    .gte('date', new Date().toISOString())
    .gte('created_at', sinceDate)
    .order('date', { ascending: true });

  // Filter out hidden events
  const newEvents: EventSummary[] = (newEventsRaw || [])
    .filter(e => !e.actions?.some((a: { action: string }) => a.action === 'hidden'))
    .map(e => ({
      title: e.title,
      date: new Date(e.date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      time: new Date(e.date).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London',
      }),
      location: e.location || 'London',
      source: (e.source as { name: string })?.name || 'Unknown',
      url: e.url,
      interests: (e.interests || []).map(
        (ei: { interest: { name: string } }) => ei.interest?.name
      ).filter(Boolean),
      is_free: e.is_free,
      is_online: e.is_online,
    }));

  // Fetch saved events in the next 30 days
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  const { data: savedRaw } = await supabase
    .from('events')
    .select(`
      *,
      source:sources(name),
      interests:event_interests(interest:interests(name)),
      actions:event_actions!inner(action)
    `)
    .eq('actions.action', 'saved')
    .gte('date', new Date().toISOString())
    .lte('date', thirtyDaysOut.toISOString())
    .order('date', { ascending: true });

  const savedEvents: SavedEvent[] = (savedRaw || []).map(e => {
    const eventDate = new Date(e.date);
    const now = new Date();
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      title: e.title,
      date: eventDate.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
      time: eventDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London',
      }),
      location: e.location || 'London',
      source: (e.source as { name: string })?.name || 'Unknown',
      url: e.url,
      interests: (e.interests || []).map(
        (ei: { interest: { name: string } }) => ei.interest?.name
      ).filter(Boolean),
      is_free: e.is_free,
      is_online: e.is_online,
      days_until: daysUntil,
    };
  });

  const { subject, html } = buildDailyDigestEmail(newEvents, savedEvents, APP_URL);
  const result = await sendEmail({ subject, html });

  if (result.success) {
    // Try to log, but don't fail if table doesn't exist
    await supabase.from('email_log').insert({
      email_type: 'daily',
      recipient: 'boynecross@gmail.com',
      subject,
      events_included: newEvents.length,
      metadata: {
        new_events: newEvents.length,
        saved_events: savedEvents.length,
      },
    });
  }

  return NextResponse.json({
    type: 'daily',
    new_events: newEvents.length,
    saved_events: savedEvents.length,
    ...result,
  });
}
