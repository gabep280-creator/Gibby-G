"use client";

import { useRouter } from "next/navigation";
import LocationForm, { type LocationFormValues } from "@/components/LocationForm";
import { api } from "@/lib/api";

export default function NewLocationPage() {
  const router = useRouter();

  async function handleSubmit(values: LocationFormValues) {
    await api.locations.create({
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

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-lg">
        <h1 className="pb-4 text-xl font-bold text-zinc-900">Add store</h1>
        <LocationForm onSubmit={handleSubmit} submitLabel="Add store" />
      </div>
    </div>
  );
}
