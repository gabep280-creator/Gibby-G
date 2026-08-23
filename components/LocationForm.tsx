"use client";

import { useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import type { Location } from "@/lib/types";

export type LocationFormValues = {
  name: string;
  address: string;
  lat: number | "";
  lng: number | "";
  storeType: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  visitFrequency: string;
  notes: string;
};

const STORE_TYPES = ["Convenience", "Grocery", "Gas Station", "Deli", "Other"];
const VISIT_FREQUENCIES = ["weekly", "biweekly", "monthly", ""];

export default function LocationForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Location;
  onSubmit: (values: LocationFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<LocationFormValues>({
    name: initial?.name ?? "",
    address: initial?.address ?? "",
    lat: initial?.lat ?? "",
    lng: initial?.lng ?? "",
    storeType: initial?.storeType ?? "",
    contactName: initial?.contactName ?? "",
    contactPhone: initial?.contactPhone ?? "",
    contactEmail: initial?.contactEmail ?? "",
    visitFrequency: initial?.visitFrequency ?? "",
    notes: initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof LocationFormValues>(key: K, val: LocationFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (values.lat === "" || values.lng === "") {
      setError("Pick an address suggestion, or enter latitude/longitude manually.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <Field label="Store name">
        <input
          required
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </Field>

      <Field label="Address">
        <AddressAutocomplete
          value={values.address}
          onChange={(v) => set("address", v)}
          onSelect={(s) => setValues((v) => ({ ...v, address: s.address, lat: s.lat, lng: s.lng }))}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude">
          <input
            type="number"
            step="any"
            required
            value={values.lat}
            onChange={(e) => set("lat", e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="any"
            required
            value={values.lng}
            onChange={(e) => set("lng", e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Store type">
          <select
            value={values.storeType}
            onChange={(e) => set("storeType", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="">—</option>
            {STORE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Visit frequency">
          <select
            value={values.visitFrequency}
            onChange={(e) => set("visitFrequency", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
          >
            {VISIT_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f || "—"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact name">
          <input
            value={values.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </Field>
        <Field label="Contact phone">
          <input
            value={values.contactPhone}
            onChange={(e) => set("contactPhone", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </Field>
      </div>

      <Field label="Contact email">
        <input
          type="email"
          value={values.contactEmail}
          onChange={(e) => set("contactEmail", e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </Field>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
