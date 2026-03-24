'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Interest } from '@/lib/supabase';
import EventCard from '@/components/EventCard';
import InterestFilter from '@/components/InterestFilter';
import {
  Radar,
  Search,
  RefreshCw,
  Loader2,
  CalendarDays,
  MapPin,
  Zap,
} from 'lucide-react';

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSaved, setShowSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [lastScraped, setLastScraped] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.set('interest', activeFilter);
      if (showSaved) params.set('saved', 'true');
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    }
    setLoading(false);
  }, [activeFilter, showSaved, searchQuery]);

  const fetchInterests = async () => {
    const { data } = await supabase.from('interests').select('*').order('name');
    if (data) setInterests(data);
  };

  const fetchLastScraped = async () => {
    const { data } = await supabase
      .from('sources')
      .select('last_scraped_at')
      .not('last_scraped_at', 'is', null)
      .order('last_scraped_at', { ascending: false })
      .limit(1);
    if (data?.[0]?.last_scraped_at) {
      setLastScraped(data[0].last_scraped_at);
    }
  };

  useEffect(() => {
    fetchInterests();
    fetchLastScraped();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSave = async (eventId: string) => {
    await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, action: 'saved' }),
    });
    fetchEvents();
  };

  const handleHide = async (eventId: string) => {
    await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, action: 'hidden' }),
    });
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
        fetchLastScraped();
      }
    } catch {
      // Scrape failed silently
    }
    setScraping(false);
  };

  const handleFilterChange = (slug: string) => {
    setShowSaved(false);
    setActiveFilter(slug);
  };

  const savedCount = events.filter((e) => e.action === 'saved').length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Radar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Events for Christian
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  London events, curated for you
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastScraped && (
                <span className="text-xs text-zinc-400 hidden sm:block">
                  Updated{' '}
                  {new Date(lastScraped).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <button
                onClick={handleScrape}
                disabled={scraping}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {scraping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {scraping ? 'Scraping...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search events, topics, venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Interest filters */}
          <InterestFilter
            interests={interests}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            savedCount={savedCount}
            showSaved={showSaved}
            onToggleSaved={() => setShowSaved(!showSaved)}
          />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-sm text-zinc-500">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CalendarDays className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
              {showSaved ? 'No saved events yet' : 'No events found'}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-4 text-center max-w-sm">
              {showSaved
                ? 'Save events by clicking the bookmark icon to see them here.'
                : 'Try a different filter, or hit Refresh to scrape for new events.'}
            </p>
            {!showSaved && (
              <button
                onClick={handleScrape}
                disabled={scraping}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Zap className="w-4 h-4" />
                Scrape Events Now
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex items-center gap-4 mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                {events.length} event{events.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                London & Online
              </span>
            </div>

            {/* Event grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onSave={handleSave}
                  onHide={handleHide}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
          <p>
            Events for Christian scrapes events from UKCLA, Fabian Society, Pints of
            Knowledge & MCA.
          </p>
          <p className="mt-1">
            No AI tokens used — events are matched using keyword-based interest
            tagging.
          </p>
        </div>
      </footer>
    </div>
  );
}
