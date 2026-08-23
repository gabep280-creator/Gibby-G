"use client";

import { useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";
import LocationDetailSheet from "@/components/LocationDetailSheet";
import RoutePlanBar from "@/components/RoutePlanBar";
import RoutePanel from "@/components/RoutePanel";
import { api } from "@/lib/api";
import type { LocationWithGrades, Product, Route } from "@/lib/types";

export default function MapPage() {
  const [locations, setLocations] = useState<LocationWithGrades[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productFilterId, setProductFilterId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const [planning, setPlanning] = useState(false);
  const [planSelection, setPlanSelection] = useState<Set<string>>(new Set());
  const [building, setBuilding] = useState(false);

  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [routeCollapsed, setRouteCollapsed] = useState(false);

  useEffect(() => {
    Promise.all([api.locations.list(), api.products.list(), api.routes.list()])
      .then(([locs, prods, routes]) => {
        setLocations(locs);
        setProducts(prods);
        setActiveRoute(routes.find((r) => r.status !== "completed") ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, []);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  async function refreshLocations() {
    const locs = await api.locations.list();
    setLocations(locs);
  }

  function handleSelectLocation(id: string) {
    if (planning) {
      setPlanSelection((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedLocationId(id);
    }
  }

  function startPlanning() {
    setSelectedLocationId(null);
    setPlanSelection(new Set());
    setPlanning(true);
  }

  async function buildRoute() {
    setBuilding(true);
    setError(null);
    try {
      const startPoint = await tryGetCurrentPosition();
      const route = await api.routes.create({
        locationIds: [...planSelection],
        startPoint: startPoint ?? undefined,
      });
      setActiveRoute(route);
      setPlanning(false);
      setPlanSelection(new Set());
      setRouteCollapsed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build route.");
    } finally {
      setBuilding(false);
    }
  }

  async function handleReorder(stopIds: string[]) {
    if (!activeRoute) return;
    const updated = await api.routes.reorder(activeRoute.id, stopIds);
    setActiveRoute(updated);
  }

  async function handleCompleteStop(stopId: string) {
    if (!activeRoute) return;
    await api.routes.updateStop(activeRoute.id, stopId, { status: "completed" });
    setActiveRoute({
      ...activeRoute,
      stops: activeRoute.stops.map((s) =>
        s.id === stopId ? { ...s, status: "completed", completedAt: new Date().toISOString() } : s
      ),
    });
  }

  async function handleFinishRoute() {
    if (!activeRoute) return;
    const updated = await api.routes.update(activeRoute.id, { status: "completed" });
    setActiveRoute(updated);
    setRouteCollapsed(true);
  }

  async function handleClearRoute() {
    if (!activeRoute) return;
    if (!confirm("Delete this route? This can't be undone.")) return;
    await api.routes.remove(activeRoute.id);
    setActiveRoute(null);
  }

  const currentStopForSelectedLocation = activeRoute?.stops.find(
    (s) => s.locationId === selectedLocationId
  );

  return (
    <div className="relative flex-1 min-h-0">
      <MapView
        locations={locations}
        productFilterId={productFilterId}
        routeStops={activeRoute?.stops ?? null}
        selectedLocationId={selectedLocationId}
        planningSelectedIds={planning ? planSelection : null}
        onSelectLocation={handleSelectLocation}
        className="absolute inset-0"
      />

      {/* Top overlay: flavor filter + plan route entry point */}
      {!planning && (
        <div className="absolute top-3 inset-x-3 z-20 flex items-center gap-2 overflow-x-auto">
          <FilterChip
            active={productFilterId === null}
            label="Needs attention"
            onClick={() => setProductFilterId(null)}
          />
          {products.map((p) => (
            <FilterChip
              key={p.id}
              active={productFilterId === p.id}
              label={p.name}
              onClick={() => setProductFilterId(p.id)}
            />
          ))}
          <button
            onClick={startPlanning}
            className="ml-auto shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-lg"
          >
            {activeRoute ? "New route" : "Plan route"}
          </button>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60">
          <p className="text-sm text-zinc-500">Loading map…</p>
        </div>
      )}

      {error && (
        <div className="absolute top-16 inset-x-3 z-20 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {planning && (
        <RoutePlanBar
          locations={locations}
          selectedIds={planSelection}
          onToggle={(id) =>
            setPlanSelection((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onSelectAll={() => setPlanSelection(new Set(locations.map((l) => l.id)))}
          onClearAll={() => setPlanSelection(new Set())}
          onCancel={() => setPlanning(false)}
          onBuild={buildRoute}
          building={building}
        />
      )}

      {!planning && selectedLocation && (
        <LocationDetailSheet
          key={selectedLocation.id}
          location={selectedLocation}
          products={products}
          onClose={() => setSelectedLocationId(null)}
          onLogged={refreshLocations}
          routeAction={
            currentStopForSelectedLocation && currentStopForSelectedLocation.status !== "completed" ? (
              <button
                onClick={() => {
                  handleCompleteStop(currentStopForSelectedLocation.id);
                  setSelectedLocationId(null);
                }}
                className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white active:bg-zinc-800"
              >
                Mark stop complete
              </button>
            ) : undefined
          }
        />
      )}

      {!planning && !selectedLocation && activeRoute && (
        <RoutePanel
          route={activeRoute}
          collapsed={routeCollapsed}
          onToggleCollapsed={() => setRouteCollapsed((c) => !c)}
          onSelectStop={setSelectedLocationId}
          onReorder={handleReorder}
          onCompleteStop={handleCompleteStop}
          onFinishRoute={handleFinishRoute}
          onClearRoute={handleClearRoute}
        />
      )}
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold shadow-lg transition-colors ${
        active ? "bg-emerald-600 text-white" : "bg-white text-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}

function tryGetCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    const timeout = setTimeout(() => resolve(null), 3000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timeout);
        resolve(null);
      },
      { timeout: 3000 }
    );
  });
}
