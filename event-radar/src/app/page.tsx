'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Interest } from '@/lib/supabase';
import EventCard from '@/components/EventCard';
import InterestFilter from '@/components/InterestFilter';
import UpcomingTimeline from '@/components/UpcomingTimeline';
import AboutSection from '@/components/AboutSection';
import {
  Radar,
  Search,
  RefreshCw,
  Loader2,
  CalendarDays,
  MapPin,
  Zap,
  Compass,
  Bookmark,
  EyeOff,
  CalendarCheck,
  Info,
  Map as MapIcon,
  List,
} from 'lucide-react';

const EventMap = lazy(() => import('@/components/EventMap'));

type Section = 'discover' | 'saved' | 'hidden' | 'upcoming' | 'about';

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [lastScraped, setLastScraped] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('discover');
  const [upcomingDays, setUpcomingDays] = useState(14);
  const [upcomingView, setUpcomingView] = useState<'timeline' | 'map'>('timeline');

  // Counts for nav badges
  const [savedCount, setSavedCount] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.set('interest', activeFilter);
      if (searchQuery) params.set('search', searchQuery);

      // Section-specific params
      if (activeSection === 'saved') {
        params.set('saved', 'true');
      } else if (activeSection === 'hidden') {
        params.set('hidden', 'true');
      } else if (activeSection === 'upcoming') {
        params.set('upcoming', 'true');
        params.set('days', upcomingDays.toString());
      } else if (activeSection === 'discover') {
        params.set('unjudged', 'true');
      }

      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    }
    setLoading(false);
  }, [activeFilter, searchQuery, activeSection, upcomingDays]);

  const fetchCounts = useCallback(async () => {
    try {
      const [savedRes, hiddenRes] = await Promise.all([
        fetch('/api/events?saved=true'),
        fetch('/api/events?hidden=true'),
      ]);
      const savedData = await savedRes.json();
      const hiddenData = await hiddenRes.json();
      setSavedCount(Array.isArray(savedData) ? savedData.length : 0);
      setHiddenCount(Array.isArray(hiddenData) ? hiddenData.length : 0);
    } catch {
      // counts fail silently
    }
  }, []);

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
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    if (activeSection !== 'about') {
      fetchEvents();
    }
  }, [fetchEvents, activeSection]);

  const handleAction = async (eventId: string, action: 'saved' | 'hidden') => {
    await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, action }),
    });
    fetchEvents();
    fetchCounts();
  };

  const handleSave = (eventId: string) => handleAction(eventId, 'saved');
  const handleHide = (eventId: string) => handleAction(eventId, 'hidden');

  // Restore = remove the hidden action (toggle it off), which the API handles
  const handleRestore = async (eventId: string) => {
    await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, action: 'hidden' }),
    });
    fetchEvents();
    fetchCounts();
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
        fetchLastScraped();
        fetchCounts();
      }
    } catch {
      // Scrape failed silently
    }
    setScraping(false);
  };

  const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'discover', label: 'Discover', icon: <Compass className="w-4 h-4" /> },
    { id: 'saved', label: 'Saved', icon: <Bookmark className="w-4 h-4" />, count: savedCount },
    { id: 'upcoming', label: 'Upcoming', icon: <CalendarCheck className="w-4 h-4" />, count: savedCount },
    { id: 'hidden', label: 'Hidden', icon: <EyeOff className="w-4 h-4" />, count: hiddenCount },
    { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
  ];

  const sectionDescriptions: Record<Section, string> = {
    discover: 'New events waiting for your judgement',
    saved: 'Events you\'ve bookmarked',
    hidden: 'Events you\'ve dismissed',
    upcoming: 'Your saved events on a timeline & map',
    about: 'Sources, methodology & how it works',
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Radar className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white truncate">
                  Events for Christian
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                  London events, curated for you
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastScraped && (
                <span className="text-xs text-zinc-400 hidden md:block">
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
                <span className="hidden sm:inline">{scraping ? 'Scraping...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeSection === item.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeSection === item.id
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Section header */}
        {activeSection !== 'about' && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            {sectionDescriptions[activeSection]}
          </p>
        )}

        {/* Search + Filters (for discover, saved, hidden) */}
        {['discover', 'saved', 'hidden'].includes(activeSection) && (
          <div className="space-y-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search events, topics, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <InterestFilter
              interests={interests}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
          </div>
        )}

        {/* Upcoming section controls */}
        {activeSection === 'upcoming' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">Show:</span>
              {[
                { days: 7, label: 'This Week' },
                { days: 14, label: '2 Weeks' },
                { days: 30, label: 'This Month' },
              ].map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setUpcomingDays(opt.days)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    upcomingDays === opt.days
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setUpcomingView('timeline')}
                className={`p-2 rounded-lg transition-all ${
                  upcomingView === 'timeline'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title="Timeline view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setUpcomingView('map')}
                className={`p-2 rounded-lg transition-all ${
                  upcomingView === 'map'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title="Map view"
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Section content */}
        {activeSection === 'about' ? (
          <AboutSection />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-sm text-zinc-500">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            section={activeSection}
            onScrape={handleScrape}
            scraping={scraping}
          />
        ) : activeSection === 'upcoming' ? (
          <div className="space-y-6">
            {upcomingView === 'map' ? (
              <Suspense fallback={
                <div className="w-full h-[400px] md:h-[500px] rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              }>
                <EventMap events={events} />
              </Suspense>
            ) : (
              <UpcomingTimeline events={events} />
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
                  onRestore={handleRestore}
                  variant={activeSection as 'discover' | 'saved' | 'hidden'}
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
            Events for Christian scrapes {interests.length > 0 ? '30+' : ''} London event sources daily.
          </p>
          <p className="mt-1">
            No AI tokens used — events are matched using keyword-based interest tagging.
          </p>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ section, onScrape, scraping }: { section: Section; onScrape: () => void; scraping: boolean }) {
  const config: Record<Section, { icon: React.ReactNode; title: string; desc: string; showScrape: boolean }> = {
    discover: {
      icon: <Compass className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />,
      title: 'No new events to judge',
      desc: 'You\'ve reviewed all available events. Hit Refresh to scrape for more, or check back tomorrow.',
      showScrape: true,
    },
    saved: {
      icon: <Bookmark className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />,
      title: 'No saved events',
      desc: 'Save events from Discover by clicking the bookmark icon. They\'ll appear here.',
      showScrape: false,
    },
    hidden: {
      icon: <EyeOff className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />,
      title: 'No hidden events',
      desc: 'Events you dismiss will appear here. You can restore them at any time.',
      showScrape: false,
    },
    upcoming: {
      icon: <CalendarCheck className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />,
      title: 'No upcoming events',
      desc: 'Save events from Discover — your upcoming ones will appear here on a timeline and map.',
      showScrape: false,
    },
    about: { icon: null, title: '', desc: '', showScrape: false },
  };

  const c = config[section];

  return (
    <div className="flex flex-col items-center justify-center py-20">
      {c.icon}
      <h3 className="text-lg font-semibold text-zinc-600 dark:text-zinc-400 mb-2 mt-4">
        {c.title}
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-4 text-center max-w-sm">
        {c.desc}
      </p>
      {c.showScrape && (
        <button
          onClick={onScrape}
          disabled={scraping}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Zap className="w-4 h-4" />
          Scrape Events Now
        </button>
      )}
    </div>
  );
}
