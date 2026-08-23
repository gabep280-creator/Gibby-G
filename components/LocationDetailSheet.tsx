"use client";

import { useState } from "react";
import Link from "next/link";
import GradeBadge from "@/components/GradeBadge";
import SalesEntryForm from "@/components/SalesEntryForm";
import type { LocationWithGrades, Product } from "@/lib/types";

/**
 * Rendered with `key={location.id}` by the map page so switching to a
 * different pin remounts this component and naturally resets `logging`,
 * instead of syncing it via an effect.
 */
export default function LocationDetailSheet({
  location,
  products,
  onClose,
  onLogged,
  routeAction,
}: {
  location: LocationWithGrades;
  products: Product[];
  onClose: () => void;
  onLogged?: () => void;
  routeAction?: React.ReactNode;
}) {
  const [logging, setLogging] = useState(false);

  return (
    <div className="fixed inset-x-0 bottom-14 sm:bottom-0 z-30 flex justify-center px-0 sm:px-4 sm:pb-4">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-zinc-200 max-h-[70vh] overflow-y-auto">
        <div className="sticky top-0 flex items-start justify-between gap-3 bg-white px-4 pt-3 pb-2 border-b border-zinc-100">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-zinc-900">{location.name}</h2>
            <p className="truncate text-sm text-zinc-500">{location.address}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 space-y-4">
          {(location.storeType || location.contactName || location.contactPhone) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
              {location.storeType && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{location.storeType}</span>}
              {location.contactName && <span>{location.contactName}</span>}
              {location.contactPhone && (
                <a href={`tel:${location.contactPhone}`} className="text-emerald-700 font-medium">
                  {location.contactPhone}
                </a>
              )}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Flavor performance
            </h3>
            {location.grades.length === 0 ? (
              <p className="text-sm text-zinc-500">No sales logged yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {location.grades
                  .slice()
                  .sort((a, b) => b.unitsSold - a.unitsSold)
                  .map((g) => (
                    <li key={g.productId} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                      <span className="text-sm font-medium text-zinc-800">{g.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">{g.unitsSold} bags</span>
                        <GradeBadge grade={g.grade} size="sm" />
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {logging ? (
            <SalesEntryForm
              locationId={location.id}
              products={products}
              onDone={() => {
                setLogging(false);
                onLogged?.();
              }}
              onCancel={() => setLogging(false)}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLogging(true)}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-emerald-700"
              >
                Log sales
              </button>
              {routeAction}
              <Link
                href={`/locations/${location.id}/edit`}
                className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 active:bg-zinc-50"
              >
                Edit
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
