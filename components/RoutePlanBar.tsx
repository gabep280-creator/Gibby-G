"use client";

import type { LocationWithGrades } from "@/lib/types";

export default function RoutePlanBar({
  locations,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  onCancel,
  onBuild,
  building,
}: {
  locations: LocationWithGrades[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onCancel: () => void;
  onBuild: () => void;
  building: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-14 sm:bottom-0 z-30 flex justify-center px-0 sm:px-4 sm:pb-4">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Plan today&apos;s route</p>
            <p className="text-xs text-zinc-500">Tap stores on the map, or pick from the list</p>
          </div>
          <button onClick={onCancel} className="text-sm font-medium text-zinc-500">
            Cancel
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 pt-2">
          <button onClick={onSelectAll} className="text-xs font-medium text-emerald-700">
            Select all
          </button>
          <span className="text-zinc-300">·</span>
          <button onClick={onClearAll} className="text-xs font-medium text-zinc-500">
            Clear
          </button>
          <span className="ml-auto text-xs text-zinc-500">{selectedIds.size} selected</span>
        </div>

        <ul className="max-h-[38vh] overflow-y-auto px-3 py-2">
          {locations.map((loc) => {
            const checked = selectedIds.has(loc.id);
            return (
              <li key={loc.id}>
                <label className="flex items-center gap-3 rounded-lg px-2 py-2 active:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(loc.id)}
                    className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800">{loc.name}</p>
                    <p className="truncate text-xs text-zinc-500">{loc.address}</p>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="px-4 pb-4 pt-1">
          <button
            onClick={onBuild}
            disabled={selectedIds.size === 0 || building}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {building ? "Optimizing…" : `Build route (${selectedIds.size} stops)`}
          </button>
        </div>
      </div>
    </div>
  );
}
