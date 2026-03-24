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

    const eventsWithCoords = events.filter(e => e.latitude && e.longitude);

    eventsWithCoords.forEach(event => {
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

      const marker = L.marker([event.latitude!, event.longitude!], { icon }).addTo(map);

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
    if (eventsWithCoords.length > 0) {
      const group = L.featureGroup(
        eventsWithCoords.map(e => L.marker([e.latitude!, e.longitude!]))
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

  return (
    <div
      ref={mapRef}
      className="w-full h-[300px] sm:h-[400px] md:h-[500px] landscape:h-[50vh] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      style={{ zIndex: 0 }}
    />
  );
}
