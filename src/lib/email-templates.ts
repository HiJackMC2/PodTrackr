// Beautiful HTML email templates for Events for Christian

type EventSummary = {
  title: string;
  date: string;
  time: string;
  location: string;
  source: string;
  url: string;
  interests: string[];
  is_free: boolean;
  is_online: boolean;
};

type SavedEvent = EventSummary & {
  days_until: number;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}

function daysUntilText(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 14) return 'Next week';
  return `In ${Math.ceil(days / 7)} weeks`;
}

function interestBadge(interest: string): string {
  const colors: Record<string, string> = {
    'Constitutional Law': '#dc2626',
    'Policy & Politics': '#2563eb',
    'Science & Research': '#16a34a',
    'Management & Consulting': '#9333ea',
    'Public Speaking & Talks': '#ea580c',
    'Social & Networking': '#0891b2',
    'Technology & AI': '#4f46e5',
    'Health & Public Services': '#e11d48',
  };
  const color = colors[interest] || '#6366f1';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:${color};background-color:${color}15;border:1px solid ${color}30;margin-right:4px;margin-bottom:4px;">${interest}</span>`;
}

function eventCard(event: EventSummary, highlight?: string): string {
  const locationIcon = event.is_online ? '🌐' : '📍';
  const freeTag = event.is_free
    ? '<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#16a34a;background-color:#f0fdf4;border:1px solid #bbf7d0;margin-left:4px;">Free</span>'
    : '';

  return `
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:12px;${highlight ? `border-left:4px solid ${highlight};` : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600;">${event.source}</span>
        ${freeTag}
      </div>
      <a href="${event.url}" style="color:#111827;text-decoration:none;font-size:17px;font-weight:700;line-height:1.4;display:block;margin-bottom:8px;">${event.title}</a>
      <div style="font-size:13px;color:#6b7280;margin-bottom:10px;">
        <span style="margin-right:12px;">📅 ${event.date}</span>
        <span style="margin-right:12px;">🕐 ${event.time}</span>
        <span>${locationIcon} ${event.location}</span>
      </div>
      ${event.interests.length > 0 ? `<div style="margin-bottom:12px;">${event.interests.map(i => interestBadge(i)).join('')}</div>` : ''}
      <a href="${event.url}" style="display:inline-block;padding:8px 20px;background:#4f46e5;color:#ffffff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">View & Sign Up →</a>
    </div>`;
}

function savedEventRow(event: SavedEvent): string {
  const urgency =
    event.days_until <= 3
      ? '#dc2626'
      : event.days_until <= 7
        ? '#ea580c'
        : '#6b7280';

  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">
        <a href="${event.url}" style="color:#111827;text-decoration:none;font-weight:600;font-size:14px;">${event.title}</a>
        <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${event.source}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;">${event.date}<br/><span style="font-size:12px;color:#9ca3af;">${event.time}</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;">${event.is_online ? '🌐 Online' : `📍 ${event.location}`}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;"><span style="font-size:12px;font-weight:700;color:${urgency};">${daysUntilText(event.days_until)}</span></td>
    </tr>`;
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="text-align:center;padding:24px 0 20px;">
      <div style="display:inline-block;width:44px;height:44px;background:#4f46e5;border-radius:12px;line-height:44px;text-align:center;margin-bottom:8px;">
        <span style="color:white;font-size:20px;">📡</span>
      </div>
      <h1 style="margin:8px 0 0;font-size:22px;color:#18181b;font-weight:800;">Events for Christian</h1>
    </div>

    ${content}

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;margin-top:20px;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#a1a1aa;margin:0;">
        Curated by Events for Christian · London events matched to your interests
      </p>
      <p style="font-size:11px;color:#d4d4d8;margin:8px 0 0;">
        No AI tokens used — events matched using keyword-based interest tagging.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function buildDailyDigestEmail(
  newEvents: EventSummary[],
  savedEvents: SavedEvent[],
  appUrl: string,
): { subject: string; html: string } {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let content = '';

  // Greeting
  content += `
    <div style="background:#ffffff;border-radius:12px;padding:24px;margin-bottom:16px;border:1px solid #e5e7eb;">
      <h2 style="margin:0 0 4px;font-size:18px;color:#18181b;">Good morning, Christian 👋</h2>
      <p style="margin:0;font-size:14px;color:#71717a;">Here's your event briefing for ${today}.</p>
    </div>`;

  // New events section
  if (newEvents.length > 0) {
    content += `
      <div style="margin-bottom:20px;">
        <h2 style="font-size:16px;color:#18181b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #4f46e5;">
          🆕 ${newEvents.length} New Event${newEvents.length !== 1 ? 's' : ''} Found
        </h2>
        ${newEvents.map(e => eventCard(e, '#4f46e5')).join('')}
      </div>`;
  } else {
    content += `
      <div style="background:#ffffff;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:14px;color:#71717a;">No new events found since yesterday. We'll keep looking! 🔍</p>
      </div>`;
  }

  // Upcoming saved events
  if (savedEvents.length > 0) {
    content += `
      <div style="margin-bottom:20px;">
        <h2 style="font-size:16px;color:#18181b;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f59e0b;">
          📌 Your Upcoming Saved Events (${savedEvents.length})
        </h2>
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#fafafa;">
                <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600;">Event</th>
                <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600;">Date</th>
                <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600;">Location</th>
                <th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600;">When</th>
              </tr>
            </thead>
            <tbody>
              ${savedEvents.map(e => savedEventRow(e)).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // CTA
  content += `
    <div style="text-align:center;padding:16px 0;">
      <a href="${appUrl}" style="display:inline-block;padding:12px 32px;background:#4f46e5;color:#ffffff;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;">Open Dashboard →</a>
    </div>`;

  const subject =
    newEvents.length > 0
      ? `${newEvents.length} new London event${newEvents.length !== 1 ? 's' : ''} for you — ${today}`
      : `Your event briefing — ${today}`;

  return { subject, html: emailWrapper(content) };
}

export function buildIntroEmail(appUrl: string): { subject: string; html: string } {
  const content = `
    <div style="background:#ffffff;border-radius:12px;padding:28px;margin-bottom:16px;border:1px solid #e5e7eb;">
      <h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Hi Christian 👋</h2>

      <p style="font-size:15px;color:#3f3f46;line-height:1.7;margin:0 0 16px;">
        Piers asked me to build you a personalised event dashboard — and here it is! I'm <strong>Claude</strong>, an AI that's been working with Piers to put this together for you.
      </p>

      <p style="font-size:15px;color:#3f3f46;line-height:1.7;margin:0 0 16px;">
        <strong>Events for Christian</strong> scrapes London events from sources matched to your interests — constitutional law, policy, public talks, consulting, and more. Here's how it works:
      </p>

      <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:16px 0;">
        <div style="margin-bottom:12px;">
          <span style="font-size:18px;margin-right:8px;">🔍</span>
          <strong style="color:#18181b;">Auto-scraped events</strong>
          <span style="color:#71717a;font-size:14px;"> — We pull events daily from UKCLA, Fabian Society, Pints of Knowledge, MCA, and more sources coming soon.</span>
        </div>
        <div style="margin-bottom:12px;">
          <span style="font-size:18px;margin-right:8px;">🏷️</span>
          <strong style="color:#18181b;">Interest matching</strong>
          <span style="color:#71717a;font-size:14px;"> — Events are auto-tagged to your interests using keyword matching (no AI cost).</span>
        </div>
        <div style="margin-bottom:12px;">
          <span style="font-size:18px;margin-right:8px;">📌</span>
          <strong style="color:#18181b;">Save & dismiss</strong>
          <span style="color:#71717a;font-size:14px;"> — Save events you like, hide ones you don't. Sign up happens on the original website.</span>
        </div>
        <div>
          <span style="font-size:18px;margin-right:8px;">📧</span>
          <strong style="color:#18181b;">Daily briefing</strong>
          <span style="color:#71717a;font-size:14px;"> — Every morning at 9am you'll get an email like this one with new events and your upcoming schedule.</span>
        </div>
      </div>

      <p style="font-size:15px;color:#3f3f46;line-height:1.7;margin:0 0 20px;">
        We're actively adding more event sources and refining the matching. If there's an organisation or type of event you'd like us to track, just reply to this email and let Piers know.
      </p>

      <div style="text-align:center;padding:8px 0 4px;">
        <a href="${appUrl}" style="display:inline-block;padding:14px 36px;background:#4f46e5;color:#ffffff;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;letter-spacing:0.3px;">Open Your Dashboard →</a>
      </div>
    </div>

    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        <strong>💡 Quick note:</strong> This is an early version. I autonomously send this morning email and will continue to do so daily at 9am with your event digest. The dashboard and sources will keep improving over time.
      </p>
    </div>`;

  return {
    subject: "Your personalised London event dashboard is live 🎯",
    html: emailWrapper(content),
  };
}

export { formatDate, formatTime };
export type { EventSummary, SavedEvent };
