'use client';

import { ExternalLink, Star, Baby, Sparkles, HandCoins, Scale } from 'lucide-react';
import type { Initiative, Company, Category } from '@/lib/supabase';
import { CategoryIcon } from '@/lib/icons';
import { formatCurrency, formatDate, initials } from '@/lib/format';
import StatusBadge from './StatusBadge';

type Props = {
  initiative: Initiative;
  company?: Company;
  category?: Category;
  followed: boolean;
  onToggleFollow: (id: string) => void;
};

export default function InitiativeCard({
  initiative: i,
  company,
  category,
  followed,
  onToggleFollow,
}: Props) {
  const accent = category?.color ?? '#6366f1';

  return (
    <article className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
        style={{ backgroundColor: accent }}
      />

      {/* Header: company + follow */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: company?.color ?? '#71717a' }}
            aria-hidden
          >
            {company ? initials(company.name) : '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {company?.name ?? 'Unknown company'}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {company?.industry ?? '—'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onToggleFollow(i.id)}
          aria-label={followed ? 'Unfollow initiative' : 'Follow initiative'}
          className={`shrink-0 rounded-full p-1.5 transition ${
            followed
              ? 'text-amber-500'
              : 'text-zinc-300 hover:text-amber-400 dark:text-zinc-600'
          }`}
        >
          <Star className="h-5 w-5" fill={followed ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Title + category */}
      <div className="mb-2 flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <CategoryIcon icon={category?.icon} className="h-3 w-3" />
          {category?.name ?? 'Uncategorised'}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
        {i.title}
      </h3>
      {i.description && (
        <p className="mt-1.5 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
          {i.description}
        </p>
      )}

      {/* Metrics */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {i.leave_weeks != null && (
          <Metric icon={<Baby className="h-3.5 w-3.5" />} label={`${i.leave_weeks} wks leave`} />
        )}
        {i.stipend_amount != null && (
          <Metric
            icon={<HandCoins className="h-3.5 w-3.5" />}
            label={formatCurrency(i.stipend_amount, i.currency)}
          />
        )}
        {i.gender_neutral && (
          <Metric icon={<Scale className="h-3.5 w-3.5" />} label="Gender-neutral" />
        )}
        {i.is_paid && (
          <Metric icon={<Sparkles className="h-3.5 w-3.5" />} label="Fully paid" />
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <StatusBadge status={i.status} />
          <span className="text-xs text-zinc-400">since {formatDate(i.start_date)}</span>
        </div>
        {i.source_url && (
          <a
            href={i.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            Source <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}

function Metric({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {icon}
      {label}
    </span>
  );
}
