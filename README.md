# PodTrackr

**Track corporate parenthood initiatives** — the programs companies run to support
employees becoming and being parents: parental leave, childcare, fertility &
family-forming benefits, flexible work, return-to-work support, nursing &
wellbeing, financial help, and parent communities.

Browse by category, compare across companies, follow the initiatives you care
about, and see how the landscape stacks up in the Insights view.

## Features

- **Discover** — filter initiatives by category and rollout status, or search across
  titles, descriptions and companies.
- **Companies** — expandable per-company view of every initiative on file.
- **Following** — star initiatives to build a shortlist (saved in your browser).
- **Insights** — benchmarks: average paid leave, gender-neutral share, rollout
  status and the companies doing the most.
- **Add** — log an initiative (and a new company) yourself.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). PodTrackr works immediately
on a **bundled demo dataset** — no configuration required. Your follows and any
initiatives you add persist in the browser via `localStorage`.

## Optional: persist to Supabase

To store data in your own database instead of the demo dataset:

1. Create a [Supabase](https://supabase.com) project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor (it creates
   the tables and seeds a starter set).
3. Copy `.env.local.example` to `.env.local` and fill in your project URL and
   anon key.

When those env vars are present the app reads from and writes new initiatives to
Supabase; otherwise it falls back to the demo data automatically.

## Tech

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4**
- **Supabase** (optional persistence)
- **lucide-react** icons

## Project structure

```
src/
  app/
    api/catalog/route.ts   # GET catalog + POST new initiative (Supabase or demo)
    page.tsx               # dashboard (Discover / Companies / Following / Insights / About)
    layout.tsx
  components/              # InitiativeCard, CompanyCard, StatsView, AddInitiativeModal, …
  lib/
    catalog.ts             # data access with Supabase -> demo fallback
    demo-data.ts           # bundled seed dataset
    supabase.ts            # client + domain types
supabase/schema.sql        # tables + seed
```
