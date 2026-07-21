'use client';

import { useMemo } from 'react';
import { Baby, Scale, Sparkles } from 'lucide-react';
import type { Initiative, Company, Category } from '@/lib/supabase';
import { CategoryIcon } from '@/lib/icons';
import { STATUS_META } from '@/lib/format';
import { STATUSES } from '@/lib/supabase';

type Props = {
  initiatives: Initiative[];
  companies: Company[];
  categories: Category[];
};

export default function StatsView({ initiatives, companies, categories }: Props) {
  const stats = useMemo(() => {
    const total = initiatives.length;
    const leaveWeeks = initiatives.map((i) => i.leave_weeks).filter((w): w is number => w != null);
    const avgLeave = leaveWeeks.length
      ? Math.round(leaveWeeks.reduce((a, b) => a + b, 0) / leaveWeeks.length)
      : 0;
    const maxLeave = leaveWeeks.length ? Math.max(...leaveWeeks) : 0;
    const genderNeutral = initiatives.filter((i) => i.gender_neutral).length;
    const paid = initiatives.filter((i) => i.is_paid).length;

    const byCategory = categories
      .map((c) => ({
        category: c,
        count: initiatives.filter((i) => i.category_slug === c.slug).length,
      }))
      .sort((a, b) => b.count - a.count);

    const byStatus = STATUSES.map((s) => ({
      status: s,
      count: initiatives.filter((i) => i.status === s).length,
    })).filter((s) => s.count > 0);

    const byCompany = companies
      .map((co) => ({
        company: co,
        count: initiatives.filter((i) => i.company_id === co.id).length,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const maxCat = Math.max(1, ...byCategory.map((c) => c.count));

    return { total, avgLeave, maxLeave, genderNeutral, paid, byCategory, byStatus, byCompany, maxCat };
  }, [initiatives, companies, categories]);

  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Highlight tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={<Baby className="h-4 w-4" />} value={`${stats.avgLeave}`} unit="wks" label="Avg. paid leave" color="#6366f1" />
        <Tile icon={<Baby className="h-4 w-4" />} value={`${stats.maxLeave}`} unit="wks" label="Longest leave" color="#0891b2" />
        <Tile icon={<Scale className="h-4 w-4" />} value={`${pct(stats.genderNeutral)}%`} label="Gender-neutral" color="#db2777" />
        <Tile icon={<Sparkles className="h-4 w-4" />} value={`${pct(stats.paid)}%`} label="Fully paid" color="#16a34a" />
      </div>

      {/* By category */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Initiatives by category
        </h3>
        <div className="space-y-3">
          {stats.byCategory.map(({ category, count }) => {
            return (
              <div key={category.id} className="flex items-center gap-3">
                <div className="flex w-40 shrink-0 items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <CategoryIcon icon={category.icon} className="h-4 w-4 shrink-0" style={{ color: category.color }} />
                  <span className="truncate">{category.name}</span>
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(count / stats.maxCat) * 100}%`, backgroundColor: category.color }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* By status */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Rollout status
          </h3>
          <div className="space-y-3">
            {stats.byStatus.map(({ status, count }) => (
              <div key={status} className="flex items-center gap-3">
                <span className="flex w-24 shrink-0 items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} />
                  {STATUS_META[status].label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${STATUS_META[status].dot}`}
                    style={{ width: `${pct(count)}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Top companies */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Most initiatives
          </h3>
          <ol className="space-y-2.5">
            {stats.byCompany.map(({ company, count }, idx) => (
              <li key={company.id} className="flex items-center gap-3">
                <span className="w-4 text-sm font-semibold text-zinc-400">{idx + 1}</span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: company.color }}
                />
                <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {company.name}
                </span>
                <span className="text-sm font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
                  {count}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Tile({
  icon,
  value,
  unit,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
        {unit && <span className="ml-0.5 text-sm font-medium text-zinc-400">{unit}</span>}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}
