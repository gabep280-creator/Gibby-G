"use client";

export const MAPBOX_PUBLIC_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export type LatLng = { lat: number; lng: number };

/**
 * Fetches a road-following line for an ordered list of stops via the
 * Mapbox Directions API (client-side, public token). Returns null if no
 * token is configured or the request fails — callers should fall back to
 * drawing straight lines between stops.
 */
export async function fetchDirectionsGeometry(
  points: LatLng[]
): Promise<[number, number][] | null> {
  if (!MAPBOX_PUBLIC_TOKEN || points.length < 2) return null;
  // Directions API supports up to 25 waypoints.
  const limited = points.slice(0, 25);
  const coords = limited.map((p) => `${p.lng},${p.lat}`).join(";");
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_PUBLIC_TOKEN}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const geometry = data?.routes?.[0]?.geometry?.coordinates;
    return Array.isArray(geometry) ? geometry : null;
  } catch {
    return null;
  }
}
