"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_PUBLIC_TOKEN, fetchDirectionsGeometry } from "@/lib/mapbox-client";
import { worstGrade } from "@/lib/grading";
import type { LocationWithGrades, RouteStop } from "@/lib/types";

if (MAPBOX_PUBLIC_TOKEN) {
  mapboxgl.accessToken = MAPBOX_PUBLIC_TOKEN;
}

const PIN_COLORS: Record<string, string> = {
  A: "#10b981",
  B: "#fbbf24",
  C: "#f43f5e",
  none: "#a1a1aa",
};

export type MapViewProps = {
  locations: LocationWithGrades[];
  productFilterId?: string | null;
  routeStops?: RouteStop[] | null;
  selectedLocationId?: string | null;
  planningSelectedIds?: Set<string> | null;
  onSelectLocation?: (id: string) => void;
  className?: string;
};

export default function MapView({
  locations,
  productFilterId = null,
  routeStops = null,
  selectedLocationId = null,
  planningSelectedIds = null,
  onSelectLocation,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const onSelectRef = useRef(onSelectLocation);
  useEffect(() => {
    onSelectRef.current = onSelectLocation;
  }, [onSelectLocation]);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_PUBLIC_TOKEN) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-80.84, 35.22],
      zoom: 11,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: true }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers with locations + grade filter.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seqByLocation = new Map<string, number>();
    routeStops?.forEach((s, i) => seqByLocation.set(s.locationId, i + 1));

    const seenIds = new Set<string>();
    for (const loc of locations) {
      seenIds.add(loc.id);
      const grade = productFilterId
        ? loc.grades.find((g) => g.productId === productFilterId)?.grade ?? null
        : worstGrade(loc.grades);
      const seq = seqByLocation.get(loc.id);
      const color = PIN_COLORS[grade ?? "none"];
      const isSelected = loc.id === selectedLocationId;
      const isPlanningSelected = planningSelectedIds?.has(loc.id) ?? false;

      let marker = markersRef.current.get(loc.id);
      if (!marker) {
        const el = document.createElement("div");
        el.style.cursor = "pointer";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRef.current?.(loc.id);
        });
        marker = new mapboxgl.Marker({ element: el }).setLngLat([loc.lng, loc.lat]).addTo(map);
        markersRef.current.set(loc.id, marker);
      }

      marker.getElement().innerHTML = renderPinHtml({ grade, color, seq, isSelected, isPlanningSelected });
    }

    for (const [id, marker] of markersRef.current) {
      if (!seenIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [locations, productFilterId, routeStops, selectedLocationId, planningSelectedIds]);

  // Fit bounds to visible locations (once per meaningful location-set change).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || locations.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    locations.forEach((l) => bounds.extend([l.lng, l.lat]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations.map((l) => l.id).join(",")]);

  // Pan/zoom to a selected location.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLocationId) return;
    const loc = locations.find((l) => l.id === selectedLocationId);
    if (!loc) return;
    map.easeTo({ center: [loc.lng, loc.lat], zoom: Math.max(map.getZoom(), 13), duration: 500 });
  }, [selectedLocationId, locations]);

  // Draw the route line, snapping to roads when a Mapbox token is available.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyRouteLine = (coords: [number, number][] | null) => {
      const source = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
      const data: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords ?? [] },
      };
      if (source) {
        source.setData(data);
      } else if (coords) {
        map.addSource("route", { type: "geojson", data });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#059669", "line-width": 5, "line-opacity": 0.85 },
        });
      }
    };

    if (!routeStops || routeStops.length < 2) {
      if (map.isStyleLoaded() && map.getSource("route")) applyRouteLine(null);
      return;
    }

    const straight: [number, number][] = routeStops.map((s) => [s.location.lng, s.location.lat]);
    let cancelled = false;

    const draw = () => {
      applyRouteLine(straight);
      fetchDirectionsGeometry(routeStops.map((s) => ({ lat: s.location.lat, lng: s.location.lng }))).then(
        (geometry) => {
          if (!cancelled && geometry) applyRouteLine(geometry as [number, number][]);
        }
      );
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);

    return () => {
      cancelled = true;
    };
  }, [routeStops]);

  if (!MAPBOX_PUBLIC_TOKEN) {
    return (
      <div className={className}>
        <FallbackMap
          locations={locations}
          productFilterId={productFilterId}
          routeStops={routeStops}
          selectedLocationId={selectedLocationId}
          planningSelectedIds={planningSelectedIds}
          onSelectLocation={onSelectLocation}
        />
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}

function renderPinHtml({
  grade,
  color,
  seq,
  isSelected,
  isPlanningSelected,
}: {
  grade: string | null;
  color: string;
  seq: number | undefined;
  isSelected: boolean;
  isPlanningSelected: boolean;
}) {
  const size = isSelected ? 40 : 32;
  const border = isPlanningSelected ? "3px solid #059669" : isSelected ? "3px solid #18181b" : "2px solid white";
  return `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <div style="
        width:${size}px;height:${size}px;border-radius:9999px;
        background:${color};border:${border};
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:700;font-size:${isSelected ? 16 : 13}px;
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
        font-family:inherit;
      ">${grade ?? "?"}</div>
      ${
        seq
          ? `<div style="position:absolute;top:-6px;right:-6px;background:#18181b;color:white;border-radius:9999px;min-width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;border:2px solid white;padding:0 3px;">${seq}</div>`
          : isPlanningSelected
          ? `<div style="position:absolute;top:-6px;right:-6px;background:#059669;color:white;border-radius:9999px;width:18px;height:18px;font-size:12px;display:flex;align-items:center;justify-content:center;border:2px solid white;">✓</div>`
          : ""
      }
    </div>
  `;
}

/** Plain-CSS pin layout used when no Mapbox token is configured, so the app
 * is still fully usable (select locations, plan routes) without any
 * external service. Projects lat/lng linearly across the bounding box of
 * the visible locations — not a real map, just a spatial approximation. */
function FallbackMap({
  locations,
  productFilterId,
  routeStops,
  selectedLocationId,
  planningSelectedIds,
  onSelectLocation,
}: Omit<MapViewProps, "className">) {
  if (locations.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-100 text-center px-6">
        <p className="text-sm text-zinc-500">No locations to show yet.</p>
      </div>
    );
  }

  const lats = locations.map((l) => l.lat);
  const lngs = locations.map((l) => l.lng);
  const pad = 0.01;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;

  const seqByLocation = new Map<string, number>();
  routeStops?.forEach((s, i) => seqByLocation.set(s.locationId, i + 1));

  const project = (lat: number, lng: number) => ({
    left: ((lng - minLng) / lngSpan) * 100,
    top: (1 - (lat - minLat) / latSpan) * 100,
  });

  const routeLinePoints = routeStops
    ?.map((s) => {
      const { left, top } = project(s.location.lat, s.location.lng);
      return `${left},${top}`;
    })
    .join(" ");

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200">
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-full bg-zinc-900/85 px-3 py-1 text-xs font-medium text-white shadow">
        No Mapbox token — showing a schematic layout
      </div>
      {routeLinePoints && (
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <polyline
            points={routeLinePoints}
            fill="none"
            stroke="#059669"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            style={{ transform: "scale(1)" }}
          />
        </svg>
      )}
      {locations.map((loc) => {
        const { left, top } = project(loc.lat, loc.lng);
        const grade = productFilterId
          ? loc.grades.find((g) => g.productId === productFilterId)?.grade ?? null
          : worstGrade(loc.grades);
        const seq = seqByLocation.get(loc.id);
        const isSelected = loc.id === selectedLocationId;
        const isPlanningSelected = planningSelectedIds?.has(loc.id) ?? false;
        const color = PIN_COLORS[grade ?? "none"];
        return (
          <button
            key={loc.id}
            onClick={() => onSelectLocation?.(loc.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full font-bold text-white shadow-lg transition-transform"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: isSelected ? 40 : 32,
              height: isSelected ? 40 : 32,
              background: color,
              border: isPlanningSelected
                ? "3px solid #059669"
                : isSelected
                ? "3px solid #18181b"
                : "2px solid white",
              fontSize: isSelected ? 16 : 13,
            }}
            aria-label={loc.name}
          >
            {grade ?? "?"}
            {seq ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-white bg-zinc-900 px-1 text-[10px] text-white">
                {seq}
              </span>
            ) : isPlanningSelected ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-[10px] text-white">
                ✓
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
