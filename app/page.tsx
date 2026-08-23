"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatDistance, formatDuration } from "@/lib/format";

type DashboardData = Awaited<ReturnType<typeof api.dashboard>>;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const route = data?.todaysRoute;
  const completedStops = route?.stops.filter((s) => s.status === "completed").length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <p className="text-sm text-zinc-500">Welcome back</p>
          <h1 className="text-2xl font-bold text-zinc-900">
            Noah&apos;s <span className="text-emerald-600">Pork Rinds</span>
          </h1>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <>
            {/* Today's route */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Today&apos;s route
              </h2>
              {route ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-zinc-900">{route.name}</p>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 capitalize">
                      {route.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-zinc-600">
                    <span>
                      {completedStops}/{route.stops.length} stops
                    </span>
                    <span>{formatDistance(route.totalDistanceMeters)}</span>
                    <span>{formatDuration(route.totalDurationSeconds)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${route.stops.length ? (completedStops / route.stops.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <Link
                    href="/map"
                    className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Open route
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-500">No route planned for today yet.</p>
                  <Link
                    href="/map"
                    className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Plan a route
                  </Link>
                </div>
              )}
            </section>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/locations" className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-2xl font-bold text-zinc-900">{data?.totalLocations ?? 0}</p>
                <p className="text-sm text-zinc-500">Stores</p>
              </Link>
              <Link href="/rankings" className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-2xl font-bold text-rose-600">{data?.flaggedCount ?? 0}</p>
                <p className="text-sm text-zinc-500">C-grade flags</p>
              </Link>
            </div>

            {/* Flagged flavors */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Needs attention</h2>
                <Link href="/rankings" className="text-xs font-medium text-emerald-700">
                  View rankings
                </Link>
              </div>
              {data && data.flagged.length > 0 ? (
                <ul className="space-y-2">
                  {data.flagged.map((f, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">{f.locationName}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {f.productName} — {f.unitsSold} bags
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                        C
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">Nothing flagged — every flavor is holding its own.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
