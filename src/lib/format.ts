import type { InitiativeStatus } from './supabase';

export function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export const STATUS_META: Record<
  InitiativeStatus,
  { label: string; dot: string; text: string; bg: string; ring: string }
> = {
  active: { label: 'Active', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/40', ring: 'ring-emerald-200 dark:ring-emerald-900' },
  piloting: { label: 'Piloting', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/40', ring: 'ring-amber-200 dark:ring-amber-900' },
  planned: { label: 'Planned', dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-950/40', ring: 'ring-sky-200 dark:ring-sky-900' },
  paused: { label: 'Paused', dot: 'bg-zinc-400', text: 'text-zinc-600 dark:text-zinc-300', bg: 'bg-zinc-100 dark:bg-zinc-800/60', ring: 'ring-zinc-200 dark:ring-zinc-700' },
  retired: { label: 'Retired', dot: 'bg-rose-400', text: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/40', ring: 'ring-rose-200 dark:ring-rose-900' },
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
