"use client";

import { useEffect, useRef, useState } from "react";
import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox-client";

type Suggestion = { address: string; lat: number; lng: number };

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: Suggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const longEnough = value.trim().length >= 4;

  useEffect(() => {
    if (!MAPBOX_PUBLIC_TOKEN || !longEnough) {
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
            value
          )}&autocomplete=true&limit=5&access_token=${MAPBOX_PUBLIC_TOKEN}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const results: Suggestion[] = (data.features ?? []).map(
          (f: { properties?: { full_address?: string; name?: string }; geometry: { coordinates: [number, number] } }) => ({
            address: f.properties?.full_address ?? f.properties?.name ?? value,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          })
        );
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        // Silently ignore — user can still type a manual address.
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, longEnough]);

  return (
    <div className="relative">
      <input
        type="text"
        required
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="123 Main St, City, State"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
      />
      {open && longEnough && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
              >
                {s.address}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!MAPBOX_PUBLIC_TOKEN && (
        <p className="mt-1 text-xs text-zinc-400">
          Address autocomplete needs NEXT_PUBLIC_MAPBOX_TOKEN — enter lat/lng manually below.
        </p>
      )}
    </div>
  );
}
