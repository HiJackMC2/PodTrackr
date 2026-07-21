'use client';

import { useState } from 'react';
import { ChevronDown, Globe, MapPin, Users2 } from 'lucide-react';
import type { Initiative, Company, Category } from '@/lib/supabase';
import { initials } from '@/lib/format';
import InitiativeCard from './InitiativeCard';

type Props = {
  company: Company;
  initiatives: Initiative[];
  categories: Category[];
  companies: Company[];
  follows: Set<string>;
  onToggleFollow: (id: string) => void;
};

export default function CompanyCard({
  company,
  initiatives,
  categories,
  follows,
  onToggleFollow,
}: Props) {
  const [open, setOpen] = useState(false);
  const catFor = (slug: string) => categories.find((c) => c.slug === slug);
  const activeCount = initiatives.filter((i) => i.status === 'active').length;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        aria-expanded={open}
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: company.color }}
          aria-hidden
        >
          {initials(company.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{company.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {company.industry && <span>{company.industry}</span>}
            {company.headquarters && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {company.headquarters}
              </span>
            )}
            {company.size && (
              <span className="inline-flex items-center gap-1">
                <Users2 className="h-3 w-3" />
                {company.size}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold leading-none text-zinc-900 dark:text-zinc-50">
              {initiatives.length}
            </p>
            <p className="text-[11px] text-zinc-500">{activeCount} active</p>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              <Globe className="h-3.5 w-3.5" />
              {company.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {initiatives.length === 0 ? (
            <p className="text-sm text-zinc-500">No initiatives tracked yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {initiatives.map((i) => (
                <InitiativeCard
                  key={i.id}
                  initiative={i}
                  company={company}
                  category={catFor(i.category_slug)}
                  followed={follows.has(i.id)}
                  onToggleFollow={onToggleFollow}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
