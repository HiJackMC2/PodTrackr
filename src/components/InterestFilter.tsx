'use client';

import type { Interest } from '@/lib/supabase';
import {
  Scale,
  Landmark,
  FlaskConical,
  Briefcase,
  Mic,
  Users,
  Cpu,
  HeartPulse,
  LayoutGrid,
  TrendingUp,
  Globe,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  scale: Scale,
  landmark: Landmark,
  'flask-conical': FlaskConical,
  briefcase: Briefcase,
  mic: Mic,
  users: Users,
  cpu: Cpu,
  'heart-pulse': HeartPulse,
  'trending-up': TrendingUp,
  globe: Globe,
};

type InterestFilterProps = {
  interests: Interest[];
  activeFilter: string;
  onFilterChange: (slug: string) => void;
};

export default function InterestFilter({
  interests,
  activeFilter,
  onFilterChange,
}: InterestFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* All events */}
      <button
        onClick={() => onFilterChange('all')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          activeFilter === 'all'
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        All
      </button>

      {/* Interest filters */}
      {interests.map((interest) => {
        const Icon = ICON_MAP[interest.icon] || Landmark;
        const isActive = activeFilter === interest.slug;
        return (
          <button
            key={interest.id}
            onClick={() => onFilterChange(interest.slug)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'text-white'
                : 'hover:opacity-80'
            }`}
            style={
              isActive
                ? { backgroundColor: interest.color }
                : {
                    backgroundColor: `${interest.color}15`,
                    color: interest.color,
                    border: `1px solid ${interest.color}30`,
                  }
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {interest.name}
          </button>
        );
      })}
    </div>
  );
}
