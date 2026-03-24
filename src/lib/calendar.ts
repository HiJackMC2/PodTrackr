import type { Event } from './supabase';

function formatICSDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICS(text: string): string {
  return text.replace(/[\\;,\n]/g, (match) => {
    if (match === '\n') return '\\n';
    return `\\${match}`;
  });
}

export function generateICSEvent(event: Event): string {
  const start = formatICSDate(event.date);
  const end = event.end_date
    ? formatICSDate(event.end_date)
    : formatICSDate(new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000).toISOString());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Events for Christian//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
    event.location ? `LOCATION:${escapeICS(event.location)}` : '',
    event.url ? `URL:${event.url}` : '',
    `UID:${event.id}@events-for-christian`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

export function generateGoogleCalendarUrl(event: Event): string {
  const start = formatICSDate(event.date);
  const endDate = event.end_date || new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const end = formatICSDate(endDate);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: [event.description || '', event.url ? `\n\nMore info: ${event.url}` : ''].join(''),
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadICS(event: Event): void {
  const icsContent = generateICSEvent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
