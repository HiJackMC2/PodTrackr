'use client';

import { useEffect, useRef } from 'react';
import type { Event } from '@/lib/supabase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type EventMapProps = {
  events: Event[];
  onEventClick?: (eventId: string) => void;
};

function daysUntil(dateStr: string) {
  const now = new Date();
  const event = new Date(dateStr);
  return Math.ceil((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function markerColor(dateStr: string): string {
  const diff = daysUntil(dateStr);
  if (diff <= 1) return '#dc2626';
  if (diff <= 3) return '#ea580c';
  if (diff <= 7) return '#d97706';
  return '#4f46e5';
}

// Guess coordinates for known London venues
function guessCoordinates(event: Event): [number, number] | null {
  if (event.latitude && event.longitude) {
    return [event.latitude, event.longitude];
  }

  const loc = (event.location || '').toLowerCase();
  const title = event.title.toLowerCase();
  const source = (event.source as { name?: string } | undefined)?.name?.toLowerCase() || '';
  const combined = `${loc} ${title} ${source}`;

  const venues: Record<string, [number, number]> = {
    'lse': [51.5144, -0.1165],
    'london school of economics': [51.5144, -0.1165],
    'ucl': [51.5246, -0.1340],
    'university college london': [51.5246, -0.1340],
    'kings college': [51.5115, -0.1160],
    "king's college": [51.5115, -0.1160],
    'kcl': [51.5115, -0.1160],
    'chatham house': [51.5074, -0.1416],
    'rsa': [51.5093, -0.1225],
    'royal society of arts': [51.5093, -0.1225],
    'british academy': [51.5082, -0.1378],
    'conway hall': [51.5226, -0.1200],
    'gresham college': [51.5155, -0.0924],
    'royal institution': [51.5095, -0.1428],
    'southbank centre': [51.5073, -0.1163],
    'institute for government': [51.5020, -0.1299],
    'ippr': [51.5208, -0.1115],
    'fabian society': [51.4913, -0.1281],
    'intelligence squared': [51.5088, -0.1342],
    'how to academy': [51.5088, -0.1342],
    'rusi': [51.5073, -0.1280],
    'prospect magazine': [51.5255, -0.0895],
    'london review bookshop': [51.5209, -0.1308],
    'ifs': [51.5189, -0.1077],
    'institute for fiscal studies': [51.5189, -0.1077],
    'demos': [51.5120, -0.0909],
    'resolution foundation': [51.5019, -0.1348],
    'wellcome collection': [51.5259, -0.1338],
    'british library': [51.5299, -0.1273],
    'barbican': [51.5200, -0.0938],
    'science museum': [51.4978, -0.1745],
    'royal society': [51.5061, -0.1318],
    'imperial college': [51.4988, -0.1749],
    'soas': [51.5222, -0.1293],
    'frontline club': [51.5173, -0.1757],
    'policy exchange': [51.5074, -0.1318],
    'westminster': [51.4995, -0.1248],
    'parliament': [51.4995, -0.1248],
    '5x15': [51.5176, -0.1531],
    'tabernacle': [51.5176, -0.1531],
  };

  for (const [keyword, coords] of Object.entries(venues)) {
    if (combined.includes(keyword)) return coords;
  }

  // For online events, skip mapping
  if (event.is_online) return null;

  // For London events without a known venue, place at a slightly randomized central location
  // so the map still shows something useful
  if (event.city === 'London' || !event.city) {
    const jitter = () => (Math.random() - 0.5) * 0.02;
    return [51.5074 + jitter(), -0.1278 + jitter()];
  }

  return null;
}

export default function EventMap({ events, onEventClick }: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center: [51.5074, -0.1278],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const mappableEvents = events
      .map(e => ({ event: e, coords: guessCoordinates(e) }))
      .filter((item): item is { event: Event; coords: [number, number] } => item.coords !== null);

    mappableEvents.forEach(({ event, coords }) => {
      const color = markerColor(event.date);
      const diff = daysUntil(event.date);
      const urgency = diff <= 1 ? 'TODAY' : diff <= 3 ? `${diff}d` : diff <= 7 ? `${diff}d` : `${Math.floor(diff / 7)}w`;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background: ${color};
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        ">${urgency}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(coords, { icon }).addTo(map);

      const sourceName = (event.source as { name: string } | undefined)?.name || '';
      const dateFormatted = new Date(event.date).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short'
      });

      marker.bindPopup(`
        <div style="max-width: 250px; font-family: system-ui, sans-serif;">
          <div style="font-size: 10px; text-transform: uppercase; color: #71717a; margin-bottom: 4px;">${sourceName}</div>
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; line-height: 1.3;">${event.title}</div>
          <div style="font-size: 12px; color: #52525b; margin-bottom: 4px;">${dateFormatted} &bull; ${event.location || 'London'}</div>
          ${event.is_free ? '<div style="font-size: 11px; color: #16a34a; font-weight: 500;">Free</div>' : ''}
          <a href="${event.url}" target="_blank" rel="noopener" style="display: inline-block; margin-top: 8px; font-size: 12px; color: #4f46e5; font-weight: 500; text-decoration: none;">View & Sign Up &rarr;</a>
        </div>
      `, { maxWidth: 280 });

      if (onEventClick) {
        marker.on('click', () => onEventClick(event.id));
      }
    });

    // Fit bounds if we have events
    if (mappableEvents.length > 0) {
      const group = L.featureGroup(
        mappableEvents.map(({ coords }) => L.marker(coords))
      );
      map.fitBounds(group.getBounds().pad(0.1));
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [events, onEventClick]);

  if (events.length === 0) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <p className="text-sm text-zinc-400">No events to show on map</p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-[300px] sm:h-[400px] md:h-[500px] landscape:h-[50vh] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      style={{ zIndex: 0 }}
    />
  );
}
