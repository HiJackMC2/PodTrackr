import type { Event } from './supabase';

/**
 * Smart event grouping: detects duplicate events from different sources.
 *
 * Strategy: Events are "the same" if they share enough similarity in title + date.
 * We use a multi-signal approach:
 * 1. Normalise titles (lowercase, strip punctuation, common words)
 * 2. Compare title similarity using trigram overlap
 * 3. Events must be on the same day
 * 4. Group matches together, keeping the richest data from each
 */

function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[''""]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|and|or|of|in|at|for|to|with|by|on|is|are)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTrigrams(text: string): Set<string> {
  const trigrams = new Set<string>();
  const padded = `  ${text} `;
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}

function trigramSimilarity(a: string, b: string): number {
  const triA = getTrigrams(a);
  const triB = getTrigrams(b);
  let intersection = 0;
  for (const t of triA) {
    if (triB.has(t)) intersection++;
  }
  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function sameDay(dateA: string, dateB: string): boolean {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type EventGroup = {
  primary: Event;
  duplicates: Event[];
  sources: string[];
};

const SIMILARITY_THRESHOLD = 0.35;

export function groupDuplicateEvents(events: Event[]): EventGroup[] {
  const groups: EventGroup[] = [];
  const assigned = new Set<string>();

  // Pre-compute normalised titles
  const normalisedMap = new Map<string, string>();
  for (const event of events) {
    normalisedMap.set(event.id, normaliseTitle(event.title));
  }

  for (let i = 0; i < events.length; i++) {
    if (assigned.has(events[i].id)) continue;

    const group: EventGroup = {
      primary: events[i],
      duplicates: [],
      sources: [getSourceName(events[i])],
    };
    assigned.add(events[i].id);

    const normA = normalisedMap.get(events[i].id)!;

    for (let j = i + 1; j < events.length; j++) {
      if (assigned.has(events[j].id)) continue;

      // Must be same day
      if (!sameDay(events[i].date, events[j].date)) continue;

      const normB = normalisedMap.get(events[j].id)!;
      const similarity = trigramSimilarity(normA, normB);

      if (similarity >= SIMILARITY_THRESHOLD) {
        group.duplicates.push(events[j]);
        group.sources.push(getSourceName(events[j]));
        assigned.add(events[j].id);

        // Keep the event with the richest data as primary
        if (shouldSwapPrimary(group.primary, events[j])) {
          group.duplicates = group.duplicates.filter(e => e.id !== events[j].id);
          group.duplicates.push(group.primary);
          group.primary = events[j];
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

function getSourceName(event: Event): string {
  return (event.source as { name: string } | undefined)?.name || 'Unknown';
}

function shouldSwapPrimary(current: Event, candidate: Event): boolean {
  // Score based on data richness
  let currentScore = 0;
  let candidateScore = 0;

  if (current.description) currentScore += 2;
  if (candidate.description) candidateScore += 2;

  if (current.location && current.location !== 'London') currentScore += 1;
  if (candidate.location && candidate.location !== 'London') candidateScore += 1;

  if (current.latitude) currentScore += 1;
  if (candidate.latitude) candidateScore += 1;

  if (current.end_date) currentScore += 1;
  if (candidate.end_date) candidateScore += 1;

  return candidateScore > currentScore;
}
