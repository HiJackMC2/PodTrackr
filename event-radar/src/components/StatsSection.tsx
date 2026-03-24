'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart3,
  Bookmark,
  EyeOff,
  CalendarDays,
  TrendingUp,
  Clock,
  Tag,
  Zap,
  Database,
} from 'lucide-react';

type Stats = {
  totalEvents: number;
  savedEvents: number;
  hiddenEvents: number;
  unjudgedEvents: number;
  upcomingThisWeek: number;
  upcomingThisMonth: number;
  totalSources: number;
  activeSources: number;
  interestBreakdown: { name: string; color: string; count: number }[];
  sourceBreakdown: { name: string; count: number }[];
  savedByWeek: { week: string; count: number }[];
  freeVsPaid: { free: number; paid: number };
};

export default function StatsSection() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 86400000);
      const monthFromNow = new Date(now.getTime() + 30 * 86400000);

      // Fetch all data in parallel
      const [
        { count: totalEvents },
        { data: allActions },
        { data: upcomingWeekData },
        { data: upcomingMonthData },
        { data: sourcesData },
        { data: interestsData },
        { data: eventInterestsData },
        { data: eventsWithFree },
      ] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('date', now.toISOString()),
        supabase.from('event_actions').select('action, created_at, event_id'),
        supabase.from('events').select('id').gte('date', now.toISOString()).lte('date', weekFromNow.toISOString()),
        supabase.from('events').select('id').gte('date', now.toISOString()).lte('date', monthFromNow.toISOString()),
        supabase.from('sources').select('id, name, enabled'),
        supabase.from('interests').select('id, name, slug, color'),
        supabase.from('event_interests').select('event_id, interest_id'),
        supabase.from('events').select('id, is_free').gte('date', now.toISOString()),
      ]);

      const actions = allActions || [];
      const saved = actions.filter(a => a.action === 'saved');
      const hidden = actions.filter(a => a.action === 'hidden');
      const judgedIds = new Set(actions.map(a => a.event_id));

      // Interest breakdown
      const interestCounts = new Map<string, number>();
      for (const ei of (eventInterestsData || [])) {
        interestCounts.set(ei.interest_id, (interestCounts.get(ei.interest_id) || 0) + 1);
      }

      const interestBreakdown = (interestsData || [])
        .map(interest => ({
          name: interest.name,
          color: interest.color,
          count: interestCounts.get(interest.id) || 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Source breakdown (how many events per source via saved events)
      const sources = sourcesData || [];

      // Saved by week (last 4 weeks)
      const savedByWeek: { week: string; count: number }[] = [];
      for (let w = 3; w >= 0; w--) {
        const weekStart = new Date(now.getTime() - (w + 1) * 7 * 86400000);
        const weekEnd = new Date(now.getTime() - w * 7 * 86400000);
        const weekLabel = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const count = saved.filter(s => {
          const d = new Date(s.created_at);
          return d >= weekStart && d < weekEnd;
        }).length;
        savedByWeek.push({ week: weekLabel, count });
      }

      // Free vs paid
      const freeEvents = (eventsWithFree || []).filter(e => e.is_free).length;

      setStats({
        totalEvents: totalEvents || 0,
        savedEvents: saved.length,
        hiddenEvents: hidden.length,
        unjudgedEvents: (totalEvents || 0) - judgedIds.size,
        upcomingThisWeek: (upcomingWeekData || []).length,
        upcomingThisMonth: (upcomingMonthData || []).length,
        totalSources: sources.length,
        activeSources: sources.filter(s => s.enabled).length,
        interestBreakdown,
        sourceBreakdown: [],
        savedByWeek,
        freeVsPaid: { free: freeEvents, paid: (eventsWithFree || []).length - freeEvents },
      });
    } catch {
      // stats fail silently
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-sm text-zinc-500">Loading stats...</div>
      </div>
    );
  }

  if (!stats) return null;

  const maxInterestCount = Math.max(...stats.interestBreakdown.map(i => i.count), 1);
  const maxWeekCount = Math.max(...stats.savedByWeek.map(w => w.count), 1);
  const totalFreeAndPaid = stats.freeVsPaid.free + stats.freeVsPaid.paid;

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<CalendarDays className="w-5 h-5" />} value={stats.totalEvents} label="Active Events" color="indigo" />
        <MetricCard icon={<Bookmark className="w-5 h-5" />} value={stats.savedEvents} label="Saved" color="amber" />
        <MetricCard icon={<EyeOff className="w-5 h-5" />} value={stats.hiddenEvents} label="Hidden" color="zinc" />
        <MetricCard icon={<Zap className="w-5 h-5" />} value={stats.unjudgedEvents} label="To Review" color="violet" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Clock className="w-5 h-5" />} value={stats.upcomingThisWeek} label="This Week" color="red" />
        <MetricCard icon={<TrendingUp className="w-5 h-5" />} value={stats.upcomingThisMonth} label="This Month" color="green" />
        <MetricCard icon={<Database className="w-5 h-5" />} value={stats.activeSources} label="Active Sources" color="blue" />
        <MetricCard
          icon={<Tag className="w-5 h-5" />}
          value={totalFreeAndPaid > 0 ? `${Math.round((stats.freeVsPaid.free / totalFreeAndPaid) * 100)}%` : '0%'}
          label="Free Events"
          color="emerald"
        />
      </div>

      {/* Interest breakdown chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Events by Interest</h3>
        </div>
        <div className="space-y-2.5">
          {stats.interestBreakdown.map(interest => (
            <div key={interest.name} className="flex items-center gap-3">
              <span className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 w-24 sm:w-36 truncate shrink-0">
                {interest.name}
              </span>
              <div className="flex-1 h-5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max((interest.count / maxInterestCount) * 100, 2)}%`,
                    backgroundColor: interest.color,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 w-8 text-right">
                {interest.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Saved activity (last 4 weeks) */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Save Activity (Last 4 Weeks)</h3>
        </div>
        <div className="flex items-end gap-3 h-32">
          {stats.savedByWeek.map((week, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{week.count}</span>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: '80px' }}>
                <div
                  className="w-full bg-indigo-500 rounded-t-lg transition-all duration-500"
                  style={{ height: `${Math.max((week.count / maxWeekCount) * 100, 4)}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 whitespace-nowrap">{week.week}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Free vs Paid split */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Free vs Paid</h3>
        <div className="flex h-6 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {totalFreeAndPaid > 0 && (
            <>
              <div
                className="bg-green-500 transition-all duration-500"
                style={{ width: `${(stats.freeVsPaid.free / totalFreeAndPaid) * 100}%` }}
                title={`${stats.freeVsPaid.free} free events`}
              />
              <div
                className="bg-indigo-500 transition-all duration-500"
                style={{ width: `${(stats.freeVsPaid.paid / totalFreeAndPaid) * 100}%` }}
                title={`${stats.freeVsPaid.paid} paid events`}
              />
            </>
          )}
        </div>
        <div className="flex justify-between mt-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            Free ({stats.freeVsPaid.free})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            Paid ({stats.freeVsPaid.paid})
          </span>
        </div>
      </div>
    </div>
  );
}

const METRIC_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/50', text: 'text-indigo-700 dark:text-indigo-300', icon: 'text-indigo-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
  zinc: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-300', icon: 'text-zinc-500' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/50', text: 'text-violet-700 dark:text-violet-300', icon: 'text-violet-500' },
  red: { bg: 'bg-red-50 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
  green: { bg: 'bg-green-50 dark:bg-green-950/50', text: 'text-green-700 dark:text-green-300', icon: 'text-green-500' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500' },
};

function MetricCard({ icon, value, label, color }: { icon: React.ReactNode; value: number | string; label: string; color: string }) {
  const c = METRIC_COLORS[color] || METRIC_COLORS.indigo;
  return (
    <div className={`${c.bg} rounded-xl p-3 sm:p-4 border border-transparent`}>
      <div className={`${c.icon} mb-1.5 sm:mb-2`}>{icon}</div>
      <div className={`text-xl sm:text-2xl font-bold ${c.text}`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}
