"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import GradeBadge from "@/components/GradeBadge";
import { worstGrade } from "@/lib/grading";
import type { LocationWithGrades } from "@/lib/types";

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationWithGrades[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.locations
      .list()
      .then(setLocations)
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this location? Sales history and route stops will be removed too.")) return;
    await api.locations.remove(id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }

  const filtered = locations.filter(
    (l) =>
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.address.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3 pb-4">
          <h1 className="text-xl font-bold text-zinc-900">Stores</h1>
          <Link
            href="/locations/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            + Add store
          </Link>
        </div>

        <input
          type="text"
          placeholder="Search stores…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">No stores found.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((loc) => {
              const grade = worstGrade(loc.grades);
              return (
                <li key={loc.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
                  {grade && <GradeBadge grade={grade} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">{loc.name}</p>
                    <p className="truncate text-xs text-zinc-500">{loc.address}</p>
                  </div>
                  <Link
                    href={`/locations/${loc.id}/edit`}
                    className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => remove(loc.id)}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-600"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
