'use client';

import { useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import type { Company, Category, Initiative, InitiativeStatus } from '@/lib/supabase';
import { STATUSES } from '@/lib/supabase';
import { STATUS_META } from '@/lib/format';

type Props = {
  companies: Company[];
  categories: Category[];
  onClose: () => void;
  onCreated: (initiative: Initiative, newCompany?: Company) => void;
};

const NEW_COMPANY = '__new__';
const PALETTE = ['#6366f1', '#0891b2', '#db2777', '#16a34a', '#ea580c', '#9333ea', '#ca8a04', '#0d9488', '#dc2626', '#2563eb'];

export default function AddInitiativeModal({ companies, categories, onClose, onCreated }: Props) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? NEW_COMPANY);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyIndustry, setNewCompanyIndustry] = useState('');
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<InitiativeStatus>('active');
  const [leaveWeeks, setLeaveWeeks] = useState('');
  const [stipend, setStipend] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [genderNeutral, setGenderNeutral] = useState(true);
  const [isPaid, setIsPaid] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addingNewCompany = companyId === NEW_COMPANY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError('Please add a title.');
    if (addingNewCompany && !newCompanyName.trim()) return setError('Please name the company.');
    if (!categorySlug) return setError('Please choose a category.');

    setSaving(true);

    const payload = {
      company_id: addingNewCompany ? undefined : companyId,
      new_company: addingNewCompany
        ? { name: newCompanyName.trim(), industry: newCompanyIndustry.trim() || undefined }
        : undefined,
      category_slug: categorySlug,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      leave_weeks: leaveWeeks ? Number(leaveWeeks) : null,
      gender_neutral: genderNeutral,
      is_paid: isPaid,
      stipend_amount: stipend ? Number(stipend) : null,
      currency,
      start_date: startDate || null,
      source_url: sourceUrl.trim() || null,
    };

    let created: Initiative | null = null;
    let createdCompany: Company | undefined;

    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      if (data.persisted && data.initiative) {
        created = data.initiative as Initiative;
        createdCompany = data.company as Company | undefined;
      }
    } catch (err) {
      // Fall through to local persistence — demo mode / offline still works.
      setError(err instanceof Error ? `Saved locally (${err.message})` : null);
    }

    // Build local objects when the server didn't persist (demo mode).
    if (!created) {
      if (addingNewCompany) {
        createdCompany = {
          id: crypto.randomUUID(),
          name: newCompanyName.trim(),
          industry: newCompanyIndustry.trim() || null,
          size: null,
          headquarters: null,
          website: null,
          color: PALETTE[Math.floor(newCompanyName.length) % PALETTE.length],
        };
      }
      created = {
        id: crypto.randomUUID(),
        company_id: addingNewCompany ? createdCompany!.id : companyId,
        category_slug: categorySlug,
        title: payload.title,
        description: payload.description ?? null,
        status,
        leave_weeks: payload.leave_weeks,
        gender_neutral: genderNeutral,
        is_paid: isPaid,
        stipend_amount: payload.stipend_amount,
        currency,
        start_date: payload.start_date,
        source_url: payload.source_url,
        created_at: new Date().toISOString(),
      };
    }

    setSaving(false);
    onCreated(created, createdCompany);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl dark:bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white/90 px-5 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Track an initiative
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Company */}
          <Field label="Company">
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className={selectCls}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={NEW_COMPANY}>+ Add a new company…</option>
            </select>
          </Field>

          {addingNewCompany && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company name">
                <input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  className={inputCls}
                />
              </Field>
              <Field label="Industry">
                <input
                  value={newCompanyIndustry}
                  onChange={(e) => setNewCompanyIndustry(e.target.value)}
                  placeholder="Technology"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* Category + status */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className={selectCls}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InitiativeStatus)}
                className={selectCls}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Title */}
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 20 weeks fully paid parental leave"
              className={inputCls}
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does the initiative offer?"
              className={`${inputCls} resize-none`}
            />
          </Field>

          {/* Numbers */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Leave (weeks)">
              <input
                type="number"
                min="0"
                value={leaveWeeks}
                onChange={(e) => setLeaveWeeks(e.target.value)}
                placeholder="—"
                className={inputCls}
              />
            </Field>
            <Field label="Stipend">
              <input
                type="number"
                min="0"
                value={stipend}
                onChange={(e) => setStipend(e.target.value)}
                placeholder="—"
                className={inputCls}
              />
            </Field>
            <Field label="Currency">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls}>
                {['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'SEK'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <Toggle label="Gender-neutral" checked={genderNeutral} onChange={setGenderNeutral} />
            <Toggle label="Fully paid" checked={isPaid} onChange={setIsPaid} />
          </div>

          {/* Meta */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Source URL">
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                className={inputCls}
              />
            </Field>
          </div>

          {error && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add initiative
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-indigo-900/40';
const selectCls = inputCls;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
      {label}
    </button>
  );
}
