'use client';

import type { Event, Interest } from '@/lib/supabase';
import { Calendar, MapPin, Globe, ExternalLink, Tag, CalendarPlus, Zap } from 'lucide-react';
import { generateGoogleCalendarUrl, downloadICS } from '@/lib/calendar';
import { useState } from 'react';

type UpcomingTimelineProps = {
  events: Event[];
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function daysUntil(dateStr: string) {
  const now = new Date();
  const event = new Date(dateStr);
  const diff = Math.ceil((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isTomorrow(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.getFullYear() === tomorrow.getFullYear() && d.getMonth() === tomorrow.getMonth() && d.getDate() === tomorrow.getDate();
}

function urgencyBorder(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff <= 1) return 'border-l-red-500';
  if (diff <= 3) return 'border-l-orange-500';
  if (diff <= 7) return 'border-l-amber-500';
  return 'border-l-indigo-500';
}

function groupByDate(events: Event[]): Record<string, Event[]> {
  const groups: Record<string, Event[]> = {};
  for (const event of events) {
    const dateKey = new Date(event.date).toISOString().split('T')[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(event);
  }
  return groups;
}

function TimelineEvent({ event }: { event: Event }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const interests = (event.interests || []) as Interest[];
  const sourceName = (event.source as { name: string } | undefined)?.name || '';

  return (
    <div className={`border-l-4 ${urgencyBorder(event.date)} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-r-lg p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-zinc-400 uppercase">{sourceName}</span>
            <span className="text-xs text-zinc-400">{formatTime(event.date)}</span>
          </div>
          <h4 className="font-semibold text-zinc-900 dark:text-white text-sm leading-snug mb-1">
            {event.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {event.location && (
              <span className="flex items-center gap-1">
                {event.is_online ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                <span className="truncate max-w-[180px]">{event.location}</span>
              </span>
            )}
            {event.is_free && (
              <span className="text-green-600 font-medium">Free</span>
            )}
          </div>
          {interests.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {interests.map(interest => (
                <span
                  key={interest.id}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: `${interest.color}15`,
                    color: interest.color,
                  }}
                >
                  <Tag className="w-2 h-2" />
                  {interest.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            title="View & Sign Up"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`p-2 rounded-lg transition-colors ${
              showCalendar
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-green-600'
            }`}
            title="Add to calendar"
          >
            <CalendarPlus className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showCalendar && (
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
          <a
            href={generateGoogleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 transition-colors"
          >
            <Calendar className="w-3 h-3" />
            Google Calendar
          </a>
          <button
            onClick={() => downloadICS(event)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 transition-colors"
          >
            <CalendarPlus className="w-3 h-3" />
            Download .ics
          </button>
        </div>
      )}
    </div>
  );
}

export default function UpcomingTimeline({ events }: UpcomingTimelineProps) {
  const grouped = groupByDate(events);
  const sortedDates = Object.keys(grouped).sort();

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-zinc-600 dark:text-zinc-400 mb-2">No upcoming events</h3>
        <p className="text-sm text-zinc-500">Save events from Discover to see them here.</p>
      </div>
    );
  }

  // Separate today's events for the highlight section
  const todayEvents = events.filter(e => isToday(e.date));
  const tomorrowEvents = events.filter(e => isTomorrow(e.date));

  return (
    <div className="space-y-6">
      {/* TODAY highlight banner */}
      {todayEvents.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-red-700 dark:text-red-400">
              Tonight — {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="space-y-2">
            {todayEvents.map(event => (
              <TimelineEvent key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* TOMORROW highlight */}
      {tomorrowEvents.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400">
              Tomorrow — {tomorrowEvents.length} event{tomorrowEvents.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="space-y-2">
            {tomorrowEvents.map(event => (
              <TimelineEvent key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Regular timeline */}
      {sortedDates.map(dateKey => {
        const dayEvents = grouped[dateKey];
        // Skip today/tomorrow since they're shown above
        if (isToday(dayEvents[0].date) || isTomorrow(dayEvents[0].date)) return null;

        const label = formatDate(dayEvents[0].date);
        const countdown = daysUntil(dayEvents[0].date);

        return (
          <div key={dateKey}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wide">
                  {label}
                </h3>
              </div>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                {countdown}
              </span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="space-y-2 ml-1.5">
              {dayEvents.map(event => (
                <TimelineEvent key={event.id} event={event} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
