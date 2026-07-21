'use client';

import { LayoutGrid, Building2, Star, BarChart3, Info } from 'lucide-react';

export type Section = 'discover' | 'companies' | 'followed' | 'stats' | 'about';

const ITEMS: { key: Section; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'discover', label: 'Discover', icon: LayoutGrid },
  { key: 'companies', label: 'Companies', icon: Building2 },
  { key: 'followed', label: 'Following', icon: Star },
  { key: 'stats', label: 'Insights', icon: BarChart3 },
  { key: 'about', label: 'About', icon: Info },
];

export default function BottomNav({
  active,
  onChange,
  followCount,
}: {
  active: Section;
  onChange: (s: Section) => void;
  followCount: number;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/90 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/90 md:hidden">
      <div className="mx-auto flex max-w-5xl items-stretch justify-around px-2">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const on = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                on ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
              }`}
              style={{ height: 'var(--bottom-nav-height)' }}
            >
              <Icon className="h-5 w-5" />
              {label}
              {key === 'followed' && followCount > 0 && (
                <span className="absolute right-1/2 top-1 translate-x-4 rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                  {followCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
