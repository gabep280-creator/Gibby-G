"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LocationForm, { type LocationFormValues } from "@/components/LocationForm";
import { api } from "@/lib/api";
import type { LocationWithGrades } from "@/lib/types";

export default function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [location, setLocation] = useState<LocationWithGrades | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.locations
      .get(id)
      .then(setLocation)
      .catch(() => setNotFound(true));
  }, [id]);

  async function handleSubmit(values: LocationFormValues) {
    await api.locations.update(id, {
      ...values,
      lat: Number(values.lat),
      lng: Number(values.lng),
      storeType: values.storeType || null,
      contactName: values.contactName || null,
      contactPhone: values.contactPhone || null,
      contactEmail: values.contactEmail || null,
      visitFrequency: values.visitFrequency || null,
      notes: values.notes || null,
    });
    router.push("/locations");
    router.refresh();
  }

  if (notFound) {
    return <p className="p-6 text-sm text-zinc-500">Location not found.</p>;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-lg">
        <h1 className="pb-4 text-xl font-bold text-zinc-900">Edit store</h1>
        {location ? (
          <LocationForm initial={location} onSubmit={handleSubmit} submitLabel="Save changes" />
        ) : (
          <p className="text-sm text-zinc-500">Loading…</p>
        )}
      </div>
    </div>
  );
}
