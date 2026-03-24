'use client';

import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  MapPin,
  Calendar,
  Clock,
  X,
  Globe,
  Tag,
  RotateCcw,
} from 'lucide-react';
import type { Event, Interest } from '@/lib/supabase';

type EventCardProps = {
  event: Event;
  onSave: (eventId: string) => void;
  onHide: (eventId: string) => void;
  onRestore?: (eventId: string) => void;
  variant?: 'discover' | 'saved' | 'hidden' | 'upcoming';
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function daysUntil(dateStr: string) {
  const now = new Date();
  const event = new Date(dateStr);
  const diff = Math.ceil((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return `In ${diff} days`;
  if (diff < 30) return `In ${Math.floor(diff / 7)} weeks`;
  return `In ${Math.floor(diff / 30)} months`;
}

function urgencyColor(dateStr: string) {
  const now = new Date();
  const event = new Date(dateStr);
  const diff = Math.ceil((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 1) return 'text-red-600 dark:text-red-400';
  if (diff <= 3) return 'text-orange-600 dark:text-orange-400';
  if (diff <= 7) return 'text-amber-600 dark:text-amber-400';
  return 'text-indigo-600 dark:text-indigo-400';
}

export default function EventCard({ event, onSave, onHide, onRestore, variant = 'discover' }: EventCardProps) {
  const isSaved = event.action === 'saved';
  const interests = (event.interests || []) as Interest[];
  const sourceName = (event.source as { name: string } | undefined)?.name || 'Unknown';

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200">
      {/* Top bar: source + timing */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide truncate mr-2">
          {sourceName}
        </span>
        <span className={`text-xs font-semibold whitespace-nowrap ${urgencyColor(event.date)}`}>
          {daysUntil(event.date)}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2 leading-snug pr-8">
        {event.title}
      </h3>

      {/* Description */}
      {event.description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
          {event.description}
        </p>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap gap-3 text-sm text-zinc-500 dark:text-zinc-400 mb-3">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{formatDate(event.date)}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {formatTime(event.date)}
        </span>
        {event.location && (
          <span className="flex items-center gap-1">
            {event.is_online ? (
              <Globe className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <MapPin className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate max-w-[200px]">{event.location}</span>
          </span>
        )}
      </div>

      {/* Interest tags */}
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {interests.map((interest) => (
            <span
              key={interest.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${interest.color}15`,
                color: interest.color,
                border: `1px solid ${interest.color}30`,
              }}
            >
              <Tag className="w-2.5 h-2.5" />
              {interest.name}
            </span>
          ))}
          {event.is_free && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
              Free
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View & Sign Up
        </a>

        {variant === 'hidden' ? (
          <button
            onClick={() => onRestore?.(event.id)}
            className="p-2 rounded-lg border border-zinc-200 text-zinc-400 hover:text-green-500 hover:border-green-200 dark:border-zinc-700 dark:hover:border-green-800 transition-colors"
            title="Restore event"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        ) : (
          <>
            <button
              onClick={() => onSave(event.id)}
              className={`p-2 rounded-lg border transition-colors ${
                isSaved
                  ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
                  : 'border-zinc-200 text-zinc-400 hover:text-amber-500 hover:border-amber-200 dark:border-zinc-700 dark:hover:border-amber-800'
              }`}
              title={isSaved ? 'Unsave' : 'Save'}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
            {variant !== 'upcoming' && (
              <button
                onClick={() => onHide(event.id)}
                className="p-2 rounded-lg border border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-200 dark:border-zinc-700 dark:hover:border-red-800 transition-colors"
                title="Hide event"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
