/**
 * Server-side helpers that call Mapbox APIs. All are safe to call without a
 * token — geocoding throws (caller should surface a clear error) and route
 * optimization falls back to a local nearest-neighbor solver so the app
 * still works end-to-end without a Mapbox account configured.
 */

export const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export type LatLng = { lat: number; lng: number };

export type GeocodeResult = {
  address: string;
  lat: number;
  lng: number;
};

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  if (!MAPBOX_TOKEN) {
    throw new Error(
      "MAPBOX_TOKEN is not set. Add it to .env to enable address geocoding."
    );
  }
  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
    query
  )}&limit=1&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Mapbox geocoding failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const feature = data?.features?.[0];
  if (!feature) {
    throw new Error(`No geocoding match found for "${query}".`);
  }
  const [lng, lat] = feature.geometry.coordinates;
  return {
    address: feature.properties?.full_address ?? feature.properties?.name ?? query,
    lat,
    lng,
  };
}

export type OptimizedStop = {
  index: number; // index into the original `points` array
  distanceFromPrevMeters: number;
  durationFromPrevSeconds: number;
};

export type OptimizedRoute = {
  stops: OptimizedStop[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  usedFallback: boolean;
};

/**
 * Sequences `points` (first point is treated as the fixed starting
 * location, e.g. the driver's current position or depot) into an efficient
 * driving order. Uses the Mapbox Optimization API v1 when a token is
 * configured, otherwise falls back to a local nearest-neighbor heuristic
 * using haversine distance.
 */
export async function optimizeRoute(points: LatLng[]): Promise<OptimizedRoute> {
  if (points.length <= 1) {
    return { stops: points.map((_, index) => ({
      index, distanceFromPrevMeters: 0, durationFromPrevSeconds: 0,
    })), totalDistanceMeters: 0, totalDurationSeconds: 0, usedFallback: false };
  }

  if (MAPBOX_TOKEN) {
    try {
      return await optimizeWithMapbox(points);
    } catch (err) {
      console.error("Mapbox optimization failed, falling back to nearest-neighbor:", err);
    }
  }

  return nearestNeighborRoute(points);
}

async function optimizeWithMapbox(points: LatLng[]): Promise<OptimizedRoute> {
  // Mapbox Optimization API v1 supports up to 12 coordinates per request.
  if (points.length > 12) {
    return nearestNeighborRoute(points);
  }
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coords}?source=first&roundtrip=false&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Mapbox optimization failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (data.code !== "Ok" || !data.trips?.[0]) {
    throw new Error(`Mapbox optimization returned code=${data.code}`);
  }

  const trip = data.trips[0];
  const waypoints: { waypoint_index: number }[] = data.waypoints;

  // Sort by the order Mapbox assigned within the trip.
  const ordered = waypoints
    .map((wp, originalIndex) => ({ originalIndex, waypointIndex: wp.waypoint_index }))
    .sort((a, b) => a.waypointIndex - b.waypointIndex);

  const legs = trip.legs as { distance: number; duration: number }[];

  const stops: OptimizedStop[] = ordered.map((o, i) => ({
    index: o.originalIndex,
    distanceFromPrevMeters: i === 0 ? 0 : Math.round(legs[i - 1]?.distance ?? 0),
    durationFromPrevSeconds: i === 0 ? 0 : Math.round(legs[i - 1]?.duration ?? 0),
  }));

  return {
    stops,
    totalDistanceMeters: Math.round(trip.distance),
    totalDurationSeconds: Math.round(trip.duration),
    usedFallback: false,
  };
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Assumes an average 30 mph in-town driving speed for the fallback ETA,
// since no routing engine is available without a Mapbox token.
const FALLBACK_MPS = 13.4;

function nearestNeighborRoute(points: LatLng[]): OptimizedRoute {
  const remaining = points.map((p, index) => ({ ...p, index }));
  const start = remaining.shift()!;
  const stops: OptimizedStop[] = [
    { index: start.index, distanceFromPrevMeters: 0, durationFromPrevSeconds: 0 },
  ];

  let current = start;
  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMeters(current, remaining[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const next = remaining.splice(nearestIdx, 1)[0];
    const distanceMeters = Math.round(nearestDist);
    const durationSeconds = Math.round(nearestDist / FALLBACK_MPS);
    stops.push({
      index: next.index,
      distanceFromPrevMeters: distanceMeters,
      durationFromPrevSeconds: durationSeconds,
    });
    totalDistanceMeters += distanceMeters;
    totalDurationSeconds += durationSeconds;
    current = next;
  }

  return { stops, totalDistanceMeters, totalDurationSeconds, usedFallback: true };
}
