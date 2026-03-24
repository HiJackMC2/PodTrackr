'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/lib/supabase';
import {
  Navigation,
  MapPin,
  Plus,
  Trash2,
  Star,
  ExternalLink,
  Train,
  Footprints,
  Car,
  Bike,
  X,
} from 'lucide-react';

type SavedAddress = {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
};

type TravelTimeProps = {
  event: Event;
};

type TravelMode = 'transit' | 'walking' | 'driving' | 'bicycling';

const MODE_CONFIG: Record<TravelMode, { icon: React.ReactNode; label: string; param: string }> = {
  transit: { icon: <Train className="w-3.5 h-3.5" />, label: 'Transit', param: 'r' },
  walking: { icon: <Footprints className="w-3.5 h-3.5" />, label: 'Walk', param: 'w' },
  driving: { icon: <Car className="w-3.5 h-3.5" />, label: 'Drive', param: 'd' },
  bicycling: { icon: <Bike className="w-3.5 h-3.5" />, label: 'Cycle', param: 'b' },
};

function buildGoogleMapsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: TravelMode
): string {
  const modeParam = MODE_CONFIG[mode].param;
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=${mode === 'transit' ? 'transit' : mode}&dirflg=${modeParam}`;
}

function estimateTravelMinutes(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: TravelMode
): number {
  // Haversine distance in km
  const R = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Rough speed estimates (km/h) for London
  const speeds: Record<TravelMode, number> = {
    walking: 5,
    bicycling: 15,
    transit: 25,
    driving: 20,
  };

  return Math.round((km / speeds[mode]) * 60);
}

// Guess coordinates for known London venues (same logic as EventMap)
function getEventCoords(event: Event): { lat: number; lng: number } | null {
  if (event.latitude && event.longitude) {
    return { lat: event.latitude, lng: event.longitude };
  }

  const loc = (event.location || '').toLowerCase();
  const source = (event.source as { name?: string } | undefined)?.name?.toLowerCase() || '';
  const combined = `${loc} ${event.title.toLowerCase()} ${source}`;

  const venues: Record<string, { lat: number; lng: number }> = {
    'lse': { lat: 51.5144, lng: -0.1165 },
    'london school of economics': { lat: 51.5144, lng: -0.1165 },
    'ucl': { lat: 51.5246, lng: -0.1340 },
    'kings college': { lat: 51.5115, lng: -0.1160 },
    "king's college": { lat: 51.5115, lng: -0.1160 },
    'chatham house': { lat: 51.5074, lng: -0.1416 },
    'rsa': { lat: 51.5093, lng: -0.1225 },
    'british academy': { lat: 51.5082, lng: -0.1378 },
    'conway hall': { lat: 51.5226, lng: -0.1200 },
    'gresham college': { lat: 51.5155, lng: -0.0924 },
    'royal institution': { lat: 51.5095, lng: -0.1428 },
    'southbank centre': { lat: 51.5073, lng: -0.1163 },
    'institute for government': { lat: 51.5020, lng: -0.1299 },
    'rusi': { lat: 51.5073, lng: -0.1280 },
    'wellcome collection': { lat: 51.5259, lng: -0.1338 },
    'british library': { lat: 51.5299, lng: -0.1273 },
    'barbican': { lat: 51.5200, lng: -0.0938 },
    'science museum': { lat: 51.4978, lng: -0.1745 },
    'royal society': { lat: 51.5061, lng: -0.1318 },
    'policy exchange': { lat: 51.5074, lng: -0.1318 },
    'frontline club': { lat: 51.5173, lng: -0.1757 },
    'soas': { lat: 51.5222, lng: -0.1293 },
    'imperial college': { lat: 51.4988, lng: -0.1749 },
  };

  for (const [keyword, coords] of Object.entries(venues)) {
    if (combined.includes(keyword)) return coords;
  }

  if (event.is_online) return null;

  // Default to central London
  return { lat: 51.5074, lng: -0.1278 };
}

export default function TravelTime({ event }: TravelTimeProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [selectedMode, setSelectedMode] = useState<TravelMode>('transit');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const def = addresses.find(a => a.is_default) || addresses[0];
      setSelectedAddress(def);
    }
  }, [addresses, selectedAddress]);

  async function fetchAddresses() {
    const { data } = await supabase
      .from('saved_addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('label');
    if (data) setAddresses(data as SavedAddress[]);
  }

  async function addAddress() {
    if (!newLabel || !newLat || !newLng) return;
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    if (isNaN(lat) || isNaN(lng)) return;

    await supabase.from('saved_addresses').insert({
      label: newLabel,
      address: newAddress || newLabel,
      latitude: lat,
      longitude: lng,
      is_default: addresses.length === 0,
    });

    setNewLabel('');
    setNewAddress('');
    setNewLat('');
    setNewLng('');
    setShowAddForm(false);
    fetchAddresses();
  }

  async function deleteAddress(id: string) {
    await supabase.from('saved_addresses').delete().eq('id', id);
    if (selectedAddress?.id === id) setSelectedAddress(null);
    fetchAddresses();
  }

  async function setDefault(id: string) {
    // Unset all defaults
    await supabase.from('saved_addresses').update({ is_default: false }).neq('id', '');
    // Set new default
    await supabase.from('saved_addresses').update({ is_default: true }).eq('id', id);
    fetchAddresses();
  }

  // Try to resolve event coordinates from DB or venue name guessing
  const eventCoords = getEventCoords(event);

  if (!eventCoords) {
    return (
      <div className="text-xs text-zinc-400 italic">
        No location coordinates available for directions.
      </div>
    );
  }

  const estimate = selectedAddress
    ? estimateTravelMinutes(selectedAddress.latitude, selectedAddress.longitude, eventCoords.lat, eventCoords.lng, selectedMode)
    : null;

  const mapsUrl = selectedAddress
    ? buildGoogleMapsUrl(selectedAddress.latitude, selectedAddress.longitude, eventCoords.lat, eventCoords.lng, selectedMode)
    : null;

  return (
    <div className="space-y-3">
      {/* From selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-zinc-500 shrink-0">From:</span>
        {addresses.map(addr => (
          <button
            key={addr.id}
            onClick={() => setSelectedAddress(addr)}
            className={`group/addr inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedAddress?.id === addr.id
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            {addr.is_default && <Star className="w-2.5 h-2.5" />}
            {addr.label}
          </button>
        ))}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Add address form */}
      {showAddForm && (
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 space-y-2 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">New Saved Location</span>
            <button onClick={() => setShowAddForm(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Label (e.g. Home, Office)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Address (optional, for your reference)"
            value={newAddress}
            onChange={e => setNewAddress(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Latitude (e.g. 51.5074)"
              value={newLat}
              onChange={e => setNewLat(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Longitude (e.g. -0.1278)"
              value={newLng}
              onChange={e => setNewLng(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <p className="text-[10px] text-zinc-400">
            Tip: Find coordinates by right-clicking any location in Google Maps and selecting the coordinates.
          </p>
          <div className="flex gap-2">
            <button
              onClick={addAddress}
              disabled={!newLabel || !newLat || !newLng}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Save Location
            </button>
          </div>
        </div>
      )}

      {/* Manage addresses */}
      {addresses.length > 0 && !showAddForm && (
        <div className="flex flex-wrap gap-1">
          {addresses.map(addr => (
            <div key={addr.id} className="inline-flex items-center gap-0.5">
              {!addr.is_default && (
                <button
                  onClick={() => setDefault(addr.id)}
                  title="Set as default"
                  className="text-zinc-300 hover:text-amber-500 transition-colors"
                >
                  <Star className="w-2.5 h-2.5" />
                </button>
              )}
              <button
                onClick={() => deleteAddress(addr.id)}
                title={`Delete ${addr.label}`}
                className="text-zinc-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Travel mode selector + estimate */}
      {selectedAddress && (
        <>
          <div className="flex items-center gap-1">
            {(Object.entries(MODE_CONFIG) as [TravelMode, typeof MODE_CONFIG.transit][]).map(([mode, config]) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedMode === mode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {config.icon}
                {config.label}
              </button>
            ))}
          </div>

          {estimate !== null && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">~{estimate} min</span>
                  <span className="text-xs text-zinc-500 ml-1.5">
                    from {selectedAddress.label}
                  </span>
                </div>
              </div>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors w-full sm:w-auto justify-center"
                >
                  <MapPin className="w-3 h-3" />
                  Open in Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
