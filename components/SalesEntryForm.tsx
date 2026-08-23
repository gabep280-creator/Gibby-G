"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";

export default function SalesEntryForm({
  locationId,
  products,
  onDone,
  onCancel,
}: {
  locationId: string;
  products: Product[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [units, setUnits] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const entries = products
      .map((p) => ({ productId: p.id, unitsSold: Number(units[p.id]) }))
      .filter((e) => Number.isFinite(e.unitsSold) && e.unitsSold >= 0 && units[e.productId] !== undefined && units[e.productId] !== "");

    if (entries.length === 0) {
      setError("Enter units sold for at least one flavor.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.sales.log({ locationId, entries, note: note || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-zinc-200 p-3">
      <h3 className="text-sm font-semibold text-zinc-700">Log units sold this visit</h3>
      {products.map((p) => (
        <label key={p.id} className="flex items-center justify-between gap-3">
          <span className="text-sm text-zinc-700">{p.name}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="0"
            value={units[p.id] ?? ""}
            onChange={(e) => setUnits((u) => ({ ...u, [p.id]: e.target.value }))}
            className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-right text-sm focus:border-emerald-500 focus:outline-none"
          />
        </label>
      ))}
      <input
        type="text"
        placeholder="Note (optional) — e.g. manager wants more BBQ"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
