'use client';

import {
  Compass,
  Bookmark,
  CalendarCheck,
  EyeOff,
  BarChart3,
  Info,
} from 'lucide-react';

type Section = 'discover' | 'saved' | 'hidden' | 'upcoming' | 'stats' | 'about';

type BottomNavProps = {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  savedCount: number;
  hiddenCount: number;
};

const NAV_ITEMS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarCheck },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'hidden', label: 'Hidden', icon: EyeOff },
  { id: 'about', label: 'About', icon: Info },
];

export default function BottomNav({ activeSection, onSectionChange, savedCount, hiddenCount }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const count = item.id === 'saved' ? savedCount : item.id === 'hidden' ? hiddenCount : 0;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg min-w-0 flex-1 transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-400 dark:text-zinc-500 active:text-zinc-600'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-indigo-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {count > 99 ? '99' : count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : ''
              }`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
