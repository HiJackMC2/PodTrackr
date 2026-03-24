'use client';

import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Interest } from '@/lib/supabase';
import EventCard from '@/components/EventCard';
import InterestFilter from '@/components/InterestFilter';
import UpcomingTimeline from '@/components/UpcomingTimeline';
import AboutSection from '@/components/AboutSection';
import StatsSection from '@/components/StatsSection';
import BottomNav from '@/components/BottomNav';
import SwipeableCard from '@/components/SwipeableCard';
import { groupDuplicateEvents, type EventGroup } from '@/lib/event-grouping';
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
  BarChart3,
  ArrowDown,
} from 'lucide-react';

const EventMap = lazy(() => import('@/components/EventMap'));

type Section = 'discover' | 'saved' | 'hidden' | 'upcoming' | 'stats' | 'about';

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

  // Pull to refresh state
  const [pullProgress, setPullProgress] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const pullStartY = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  // Counts for nav badges
  const [savedCount, setSavedCount] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Query Supabase directly from client (avoids API route issues on Vercel)
      let query = supabase
        .from('events')
        .select(`
          *,
          source:sources(id, name, url),
          interests:event_interests(interest:interests(*)),
          actions:event_actions(action, created_at)
        `)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });

      if (activeFilter !== 'all') {
        query = supabase
          .from('events')
          .select(`
            *,
            source:sources(id, name, url),
            interests:event_interests!inner(interest:interests!inner(*)),
            actions:event_actions(action, created_at)
          `)
          .eq('interests.interest.slug', activeFilter)
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true });
      }

      if (activeSection === 'upcoming') {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + upcomingDays);
        query = query.lte('date', maxDate.toISOString());
      }

      const { data: rawEvents, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        setEvents([]);
        setLoading(false);
        return;
      }

      // Post-process: flatten interests and actions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let processed = (rawEvents || []).map((event: any) => {
        const eventInterests = (event.interests || []).map(
          (ei: { interest: Record<string, unknown> }) => ei.interest
        );
        const actionEntry = event.actions?.[0];
        const action = actionEntry?.action || null;
        const actionDate = actionEntry?.created_at || null;
        return { ...event, interests: eventInterests, action, actionDate, actions: undefined };
      }) as Event[];

      // View mode filtering
      if (activeSection === 'hidden') {
        processed = processed.filter(e => e.action === 'hidden');
      } else if (activeSection === 'saved' || activeSection === 'upcoming') {
        processed = processed.filter(e => e.action === 'saved');
      } else if (activeSection === 'discover') {
        processed = processed.filter(e => !e.action);
      } else {
        processed = processed.filter(e => e.action !== 'hidden');
      }

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        processed = processed.filter(
          e =>
            e.title.toLowerCase().includes(q) ||
            (e.description || '').toLowerCase().includes(q) ||
            (e.location || '').toLowerCase().includes(q)
        );
      }

      setEvents(processed);
    } catch (err) {
      console.error('fetchEvents error:', err);
      setEvents([]);
    }
    setLoading(false);
  }, [activeFilter, searchQuery, activeSection, upcomingDays]);

  const fetchCounts = useCallback(async () => {
    try {
      const { data: actions } = await supabase
        .from('event_actions')
        .select('action, event_id');
      const saved = (actions || []).filter(a => a.action === 'saved');
      const hidden = (actions || []).filter(a => a.action === 'hidden');
      setSavedCount(saved.length);
      setHiddenCount(hidden.length);
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
    if (activeSection !== 'about' && activeSection !== 'stats') {
      fetchEvents();
    }
  }, [fetchEvents, activeSection]);

  // Pull-to-refresh handlers
  const handlePullStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handlePullMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;
    const diff = e.touches[0].clientY - pullStartY.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullProgress(Math.min(diff / 120, 1));
    }
  }, [isPulling]);

  const handlePullEnd = useCallback(() => {
    if (pullProgress >= 1) {
      handleScrape();
    }
    setPullProgress(0);
    setIsPulling(false);
  }, [pullProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smart event grouping
  const groupedEvents: EventGroup[] = useMemo(() => {
    if (activeSection === 'discover') {
      return groupDuplicateEvents(events);
    }
    return events.map(e => ({ primary: e, duplicates: [], sources: [(e.source as { name: string } | undefined)?.name || 'Unknown'] }));
  }, [events, activeSection]);

  const handleAction = async (eventId: string, action: 'saved' | 'hidden') => {
    await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, action }),
    });
    fetchEvents();
    fetchCounts();
  };

  const handleSave = async (eventId: string) => {
    const group = groupedEvents.find(g => g.primary.id === eventId);
    await handleAction(eventId, 'saved');
    if (group) {
      for (const dup of group.duplicates) {
        await handleAction(dup.id, 'saved');
      }
    }
  };

  const handleHide = async (eventId: string) => {
    const group = groupedEvents.find(g => g.primary.id === eventId);
    await handleAction(eventId, 'hidden');
    if (group) {
      for (const dup of group.duplicates) {
        await handleAction(dup.id, 'hidden');
      }
    }
  };

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

  const handleSectionChange = (section: Section) => {
    setActiveSection(section);
    setSearchQuery('');
    setActiveFilter('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'discover', label: 'Discover', icon: <Compass className="w-4 h-4" /> },
    { id: 'saved', label: 'Saved', icon: <Bookmark className="w-4 h-4" />, count: savedCount },
    { id: 'upcoming', label: 'Upcoming', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'hidden', label: 'Hidden', icon: <EyeOff className="w-4 h-4" />, count: hiddenCount },
    { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
  ];

  const sectionDescriptions: Record<Section, string> = {
    discover: 'New events waiting for your judgement',
    saved: 'Events you\'ve bookmarked',
    hidden: 'Events you\'ve dismissed',
    upcoming: 'Your saved events on a timeline & map',
    stats: 'Your event discovery at a glance',
    about: 'Sources, methodology & how it works',
  };

  return (
    <div
      className="min-h-screen bg-zinc-50 dark:bg-zinc-950"
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
    >
      {/* Pull to refresh indicator */}
      {pullProgress > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center pointer-events-none pull-indicator"
          style={{ transform: `translateY(${pullProgress * 60 - 40}px)`, opacity: pullProgress }}
        >
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-medium shadow-lg ${pullProgress >= 1 ? 'scale-110' : ''} transition-transform`}>
            <ArrowDown className={`w-3.5 h-3.5 transition-transform ${pullProgress >= 1 ? 'rotate-180' : ''}`} />
            {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Radar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white truncate">
                  Events for Christian
                </h1>
                <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                  London events, curated for you
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {lastScraped && (
                <span className="text-[10px] sm:text-xs text-zinc-400 hidden lg:block">
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
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
              >
                {scraping ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="hidden sm:inline">{scraping ? 'Scraping...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Desktop navigation tabs — hidden on mobile (bottom nav instead) */}
          <nav className="hidden md:flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
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
      <main ref={mainRef} className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Section header */}
        {activeSection !== 'about' && (
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-3 sm:mb-4">
            {sectionDescriptions[activeSection]}
            {activeSection === 'discover' && (
              <span className="text-zinc-400 ml-1 hidden sm:inline">
                — swipe right to save, left to hide
              </span>
            )}
          </p>
        )}

        {/* Search + Filters */}
        {['discover', 'saved', 'hidden'].includes(activeSection) && (
          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search events, topics, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
              <InterestFilter
                interests={interests}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            </div>
          </div>
        )}

        {/* Upcoming section controls */}
        {activeSection === 'upcoming' && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-zinc-500">Show:</span>
              {[
                { days: 7, label: 'Week' },
                { days: 14, label: '2 Weeks' },
                { days: 30, label: 'Month' },
              ].map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setUpcomingDays(opt.days)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    upcomingDays === opt.days
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setUpcomingView('timeline')}
                className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                  upcomingView === 'timeline'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                }`}
                title="Timeline view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setUpcomingView('map')}
                className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                  upcomingView === 'map'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
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
        ) : activeSection === 'stats' ? (
          <StatsSection />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20">
            <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-500 animate-spin mb-3 sm:mb-4" />
            <p className="text-xs sm:text-sm text-zinc-500">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            section={activeSection}
            onScrape={handleScrape}
            scraping={scraping}
          />
        ) : activeSection === 'upcoming' ? (
          <div className="space-y-4 sm:space-y-6">
            {upcomingView === 'map' ? (
              <Suspense fallback={
                <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] landscape:h-[50vh] rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
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
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {groupedEvents.length} event{groupedEvents.length !== 1 ? 's' : ''}
                {groupedEvents.length !== events.length && (
                  <span className="text-[10px] sm:text-xs text-zinc-400 ml-1">
                    ({events.length - groupedEvents.length} merged)
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                London
              </span>
            </div>

            {/* Event grid — swipeable on mobile in discover mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {groupedEvents.map((group) => (
                activeSection === 'discover' ? (
                  <SwipeableCard
                    key={group.primary.id}
                    onSwipeRight={() => handleSave(group.primary.id)}
                    onSwipeLeft={() => handleHide(group.primary.id)}
                    enabled={true}
                  >
                    <EventCard
                      event={group.primary}
                      onSave={handleSave}
                      onHide={handleHide}
                      onRestore={handleRestore}
                      variant="discover"
                      duplicateSources={group.sources.length > 1 ? group.sources : undefined}
                    />
                  </SwipeableCard>
                ) : (
                  <EventCard
                    key={group.primary.id}
                    event={group.primary}
                    onSave={handleSave}
                    onHide={handleHide}
                    onRestore={handleRestore}
                    variant={activeSection as 'saved' | 'hidden'}
                    duplicateSources={group.sources.length > 1 ? group.sources : undefined}
                  />
                )
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-4 sm:py-6 mt-8 sm:mt-12">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 text-center text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-600">
          <p>
            Events for Christian scrapes 80+ London event sources daily.
          </p>
          <p className="mt-1">
            No AI tokens used — events are matched using keyword-based interest tagging.
          </p>
        </div>
      </footer>

      {/* Mobile bottom navigation */}
      <BottomNav
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        savedCount={savedCount}
        hiddenCount={hiddenCount}
      />
    </div>
  );
}

function EmptyState({ section, onScrape, scraping }: { section: Section; onScrape: () => void; scraping: boolean }) {
  const config: Record<string, { icon: React.ReactNode; title: string; desc: string; showScrape: boolean }> = {
    discover: {
      icon: <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-300 dark:text-zinc-700" />,
      title: 'No new events to judge',
      desc: 'You\'ve reviewed all available events. Hit Refresh to scrape for more, or check back tomorrow.',
      showScrape: true,
    },
    saved: {
      icon: <Bookmark className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-300 dark:text-zinc-700" />,
      title: 'No saved events',
      desc: 'Save events from Discover by clicking the bookmark icon. They\'ll appear here.',
      showScrape: false,
    },
    hidden: {
      icon: <EyeOff className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-300 dark:text-zinc-700" />,
      title: 'No hidden events',
      desc: 'Events you dismiss will appear here. You can restore them at any time.',
      showScrape: false,
    },
    upcoming: {
      icon: <CalendarCheck className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-300 dark:text-zinc-700" />,
      title: 'No upcoming events',
      desc: 'Save events from Discover — your upcoming ones will appear here on a timeline and map.',
      showScrape: false,
    },
  };

  const c = config[section] || config.discover;

  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20">
      {c.icon}
      <h3 className="text-base sm:text-lg font-semibold text-zinc-600 dark:text-zinc-400 mb-2 mt-3 sm:mt-4">
        {c.title}
      </h3>
      <p className="text-xs sm:text-sm text-zinc-500 mb-4 text-center max-w-sm px-4">
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
