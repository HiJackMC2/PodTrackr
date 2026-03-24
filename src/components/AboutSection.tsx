'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Database,
  Globe,
  Rss,
  Code,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

type SourceInfo = {
  id: string;
  name: string;
  url: string;
  scrape_type: string;
  enabled: boolean;
  last_scraped_at: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  'all': 'Event Sources',
};

const SCRAPE_TYPE_ICONS: Record<string, React.ReactNode> = {
  rss: <Rss className="w-3.5 h-3.5" />,
  html: <Code className="w-3.5 h-3.5" />,
  api: <Database className="w-3.5 h-3.5" />,
};

export default function AboutSection() {
  const [sources, setSources] = useState<SourceInfo[]>([]);

  useEffect(() => {
    async function fetchSources() {
      const { data } = await supabase
        .from('sources')
        .select('id, name, url, scrape_type, enabled, last_scraped_at')
        .order('name');
      if (data) setSources(data as SourceInfo[]);
    }
    fetchSources();
  }, []);

  const grouped = { 'all': sources };

  const enabledCount = sources.filter(s => s.enabled).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 rounded-2xl p-6 md:p-8 border border-indigo-100 dark:border-indigo-900/50">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
          About Events for Christian
        </h2>
        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
          A personalised event discovery dashboard that automatically finds in-person intellectual events in London
          tailored to your interests in constitutional law, progressive policy, science communication, and consulting.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Stat icon={<Database className="w-5 h-5" />} value={sources.length.toString()} label="Total Sources" />
          <Stat icon={<CheckCircle className="w-5 h-5" />} value={enabledCount.toString()} label="Active Sources" />
          <Stat icon={<Tag className="w-5 h-5" />} value="10" label="Interest Tags" />
          <Stat icon={<Clock className="w-5 h-5" />} value="7 AM" label="Daily Scrape" />
        </div>
      </div>

      {/* Methodology */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">How it Works</h3>
        <div className="space-y-4">
          <Step number={1} title="Automated Scraping">
            Every morning at 7 AM, we scrape {enabledCount} event sources using RSS feeds, HTML parsing (Cheerio),
            and API integrations. Each source has custom configuration for extracting event details.
          </Step>
          <Step number={2} title="Smart Filtering">
            Events are filtered to only include in-person London events (plus notable online events) with valid
            future dates. Duplicate events are automatically detected and merged.
          </Step>
          <Step number={3} title="Interest Tagging">
            Each event is auto-tagged to your interests using keyword matching — no AI tokens used. The system matches event
            titles and descriptions against curated keyword dictionaries for each interest category.
          </Step>
          <Step number={4} title="Daily Email Digest">
            At 8 AM, you receive an email digest with new events found and upcoming saved events, colour-coded by urgency.
          </Step>
        </div>
      </div>

      {/* Sources by category */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
          All Sources ({sources.length})
        </h3>

        {Object.entries(grouped).map(([category, catSources]) => (
          <div key={category} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
              <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                {CATEGORY_LABELS[category] || category}
              </h4>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {catSources.map(source => (
                <div key={source.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 text-zinc-400">
                      {SCRAPE_TYPE_ICONS[source.scrape_type] || <Globe className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate block"
                      >
                        {source.name}
                      </a>
                      <span className="text-xs text-zinc-400 truncate block">{source.url}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {source.scrape_type}
                    </span>
                    {source.enabled ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-zinc-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Built With</h3>
        <div className="flex flex-wrap gap-2">
          {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Cheerio', 'Leaflet', 'Resend', 'Vercel'].map(tech => (
            <span key={tech} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-medium rounded-lg">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="flex justify-center text-indigo-600 dark:text-indigo-400 mb-1">{icon}</div>
      <div className="text-xl font-bold text-zinc-900 dark:text-white">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-zinc-900 dark:text-white text-sm mb-1">{title}</h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
