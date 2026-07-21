'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Baby,
  Search,
  Plus,
  Star,
  Building2,
  Sparkles,
  Loader2,
  LayoutGrid,
  BarChart3,
  Info,
  X,
} from 'lucide-react';
import type { Catalog, Company, Category, Initiative, InitiativeStatus } from '@/lib/supabase';
import { STATUSES } from '@/lib/supabase';
import { STATUS_META } from '@/lib/format';
import { CategoryIcon } from '@/lib/icons';
import InitiativeCard from '@/components/InitiativeCard';
import CompanyCard from '@/components/CompanyCard';
import StatsView from '@/components/StatsView';
import AddInitiativeModal from '@/components/AddInitiativeModal';
import BottomNav, { type Section } from '@/components/BottomNav';

const LS_FOLLOWS = 'podtrackr:follows';
const LS_ADDED = 'podtrackr:added-initiatives';
const LS_COMPANIES = 'podtrackr:added-companies';

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [addedInitiatives, setAddedInitiatives] = useState<Initiative[]>([]);
  const [addedCompanies, setAddedCompanies] = useState<Company[]>([]);
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [section, setSection] = useState<Section>('discover');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<InitiativeStatus | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);

  // --- Load persisted client state ---
  useEffect(() => {
    try {
      const f = localStorage.getItem(LS_FOLLOWS);
      if (f) setFollows(new Set(JSON.parse(f)));
      const a = localStorage.getItem(LS_ADDED);
      if (a) setAddedInitiatives(JSON.parse(a));
      const c = localStorage.getItem(LS_COMPANIES);
      if (c) setAddedCompanies(JSON.parse(c));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  // --- Fetch catalog ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/catalog');
        const data = (await res.json()) as Catalog;
        if (!cancelled) setCatalog(data);
      } catch {
        if (!cancelled) setCatalog({ companies: [], categories: [], initiatives: [], source: 'demo' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Merged data ---
  const companies = useMemo<Company[]>(() => {
    const base = catalog?.companies ?? [];
    const seen = new Set(base.map((c) => c.id));
    return [...base, ...addedCompanies.filter((c) => !seen.has(c.id))];
  }, [catalog, addedCompanies]);

  const categories = useMemo<Category[]>(() => catalog?.categories ?? [], [catalog]);

  const initiatives = useMemo<Initiative[]>(() => {
    const base = catalog?.initiatives ?? [];
    const seen = new Set(base.map((i) => i.id));
    return [...addedInitiatives.filter((i) => !seen.has(i.id)), ...base];
  }, [catalog, addedInitiatives]);

  const companyById = useCallback(
    (id: string) => companies.find((c) => c.id === id),
    [companies]
  );
  const categoryBySlug = useCallback(
    (slug: string) => categories.find((c) => c.slug === slug),
    [categories]
  );

  // --- Follow toggle (persisted locally) ---
  const toggleFollow = useCallback((id: string) => {
    setFollows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(LS_FOLLOWS, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // --- Handle newly created initiative ---
  const handleCreated = useCallback((initiative: Initiative, newCompany?: Company) => {
    setAddedInitiatives((prev) => {
      const next = [initiative, ...prev];
      try {
        localStorage.setItem(LS_ADDED, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    if (newCompany) {
      setAddedCompanies((prev) => {
        const next = [newCompany, ...prev];
        try {
          localStorage.setItem(LS_COMPANIES, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }
    setShowAdd(false);
  }, []);

  // --- Filtering for discover ---
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initiatives.filter((i) => {
      if (activeCategory !== 'all' && i.category_slug !== activeCategory) return false;
      if (activeStatus !== 'all' && i.status !== activeStatus) return false;
      if (q) {
        const co = companyById(i.company_id);
        const hay = `${i.title} ${i.description ?? ''} ${co?.name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initiatives, search, activeCategory, activeStatus, companyById]);

  const followedInitiatives = useMemo(
    () => initiatives.filter((i) => follows.has(i.id)),
    [initiatives, follows]
  );

  const summary = useMemo(() => {
    const active = initiatives.filter((i) => i.status === 'active').length;
    const leave = initiatives.map((i) => i.leave_weeks).filter((w): w is number => w != null);
    const avgLeave = leave.length ? Math.round(leave.reduce((a, b) => a + b, 0) / leave.length) : 0;
    return { total: initiatives.length, companies: companies.length, active, avgLeave };
  }, [initiatives, companies]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Baby className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none tracking-tight text-zinc-900 dark:text-zinc-50">
                  PodTrackr
                </h1>
                <p className="text-[11px] text-zinc-500">Corporate parenthood initiatives</p>
              </div>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>

          {/* Desktop nav */}
          <nav className="mt-3 hidden items-center gap-1 md:flex">
            {(
              [
                ['discover', 'Discover', LayoutGrid],
                ['companies', 'Companies', Building2],
                ['followed', 'Following', Star],
                ['stats', 'Insights', BarChart3],
                ['about', 'About', Info],
              ] as const
            ).map(([key, label, Icon]) => {
              const on = section === key;
              return (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    on
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {key === 'followed' && follows.size > 0 && (
                    <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                      {follows.size}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm">Loading initiatives…</p>
          </div>
        ) : (
          <>
            {section === 'discover' && (
              <Discover
                summary={summary}
                categories={categories}
                initiatives={initiatives}
                filtered={filtered}
                search={search}
                setSearch={setSearch}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                activeStatus={activeStatus}
                setActiveStatus={setActiveStatus}
                companyById={companyById}
                categoryBySlug={categoryBySlug}
                follows={follows}
                onToggleFollow={toggleFollow}
                onAdd={() => setShowAdd(true)}
              />
            )}

            {section === 'companies' && (
              <div className="space-y-3">
                {companies
                  .map((co) => ({
                    company: co,
                    items: initiatives.filter((i) => i.company_id === co.id),
                  }))
                  .sort((a, b) => b.items.length - a.items.length)
                  .map(({ company, items }) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      initiatives={items}
                      categories={categories}
                      companies={companies}
                      follows={follows}
                      onToggleFollow={toggleFollow}
                    />
                  ))}
              </div>
            )}

            {section === 'followed' && (
              <>
                {followedInitiatives.length === 0 ? (
                  <Empty
                    icon={<Star className="h-7 w-7" />}
                    title="Nothing followed yet"
                    body="Tap the star on any initiative to keep an eye on it here."
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {followedInitiatives.map((i) => (
                      <InitiativeCard
                        key={i.id}
                        initiative={i}
                        company={companyById(i.company_id)}
                        category={categoryBySlug(i.category_slug)}
                        followed
                        onToggleFollow={toggleFollow}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {section === 'stats' && (
              <StatsView initiatives={initiatives} companies={companies} categories={categories} />
            )}

            {section === 'about' && <About source={catalog?.source ?? 'demo'} />}
          </>
        )}
      </main>

      <BottomNav active={section} onChange={setSection} followCount={follows.size} />

      {showAdd && (
        <AddInitiativeModal
          companies={companies}
          categories={categories}
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discover section
// ---------------------------------------------------------------------------

function Discover(props: {
  summary: { total: number; companies: number; active: number; avgLeave: number };
  categories: Category[];
  initiatives: Initiative[];
  filtered: Initiative[];
  search: string;
  setSearch: (s: string) => void;
  activeCategory: string;
  setActiveCategory: (s: string) => void;
  activeStatus: InitiativeStatus | 'all';
  setActiveStatus: (s: InitiativeStatus | 'all') => void;
  companyById: (id: string) => Company | undefined;
  categoryBySlug: (slug: string) => Category | undefined;
  follows: Set<string>;
  onToggleFollow: (id: string) => void;
  onAdd: () => void;
}) {
  const {
    summary,
    categories,
    initiatives,
    filtered,
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    activeStatus,
    setActiveStatus,
    companyById,
    categoryBySlug,
    follows,
    onToggleFollow,
    onAdd,
  } = props;

  const countFor = (slug: string) => initiatives.filter((i) => i.category_slug === slug).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary icon={<Sparkles className="h-4 w-4" />} value={summary.total} label="Initiatives" color="#6366f1" />
        <Summary icon={<Building2 className="h-4 w-4" />} value={summary.companies} label="Companies" color="#0891b2" />
        <Summary icon={<Star className="h-4 w-4" />} value={summary.active} label="Active" color="#16a34a" />
        <Summary icon={<Baby className="h-4 w-4" />} value={`${summary.avgLeave}w`} label="Avg. leave" color="#db2777" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search initiatives, companies…"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-indigo-900/40"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        <Chip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>
          All categories
        </Chip>
        {categories.map((c) => {
          const active = activeCategory === c.slug;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(active ? 'all' : c.slug)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'border-transparent text-white'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
              style={active ? { backgroundColor: c.color } : undefined}
            >
              <CategoryIcon icon={c.icon} className="h-3.5 w-3.5" style={active ? undefined : { color: c.color }} />
              {c.name}
              <span className={active ? 'opacity-80' : 'text-zinc-400'}>{countFor(c.slug)}</span>
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Chip active={activeStatus === 'all'} onClick={() => setActiveStatus('all')} small>
          Any status
        </Chip>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setActiveStatus(activeStatus === s ? 'all' : s)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              activeStatus === s
                ? `${STATUS_META[s].bg} ${STATUS_META[s].text} border-transparent ring-1 ring-inset ${STATUS_META[s].ring}`
                : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot}`} />
            {STATUS_META[s].label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Empty
          icon={<Search className="h-7 w-7" />}
          title="No initiatives match"
          body="Try clearing filters, or add one you know about."
          action={{ label: 'Add an initiative', onClick: onAdd }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <InitiativeCard
              key={i.id}
              initiative={i}
              company={companyById(i.company_id)}
              category={categoryBySlug(i.category_slug)}
              followed={follows.has(i.id)}
              onToggleFollow={onToggleFollow}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function Summary({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className="mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center rounded-full border font-medium transition ${
        small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
      } ${
        active
          ? 'border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-zinc-500">{body}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}

function About({ source }: { source: 'supabase' | 'demo' }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Baby className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">About PodTrackr</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          PodTrackr catalogs the programs companies run to support employees becoming and being
          parents — parental leave, childcare, fertility and family-forming benefits, flexible work,
          return-to-work support and more. Browse by category, compare across companies, follow the
          initiatives you care about, and see how the landscape is shaping up.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">How it works</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex gap-2">
            <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            Follow initiatives to build a shortlist — saved in your browser.
          </li>
          <li className="flex gap-2">
            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            Add initiatives you know about; they persist locally and sync to your database when one is
            configured.
          </li>
          <li className="flex gap-2">
            <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            The Insights tab benchmarks leave length, gender-neutral policies and rollout status.
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
        <p>
          Data source: <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {source === 'supabase' ? 'Supabase database' : 'bundled demo dataset'}
          </span>
          . The seeded companies and figures are illustrative, drawn from publicly reported programs,
          and may not reflect current policies. Configure Supabase (see <code>README.md</code>) to
          track your own data.
        </p>
      </div>
    </div>
  );
}
