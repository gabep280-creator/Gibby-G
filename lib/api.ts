"use client";

import type { Location, LocationWithGrades, Product, Route } from "@/lib/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${url} failed with ${res.status}`);
  }
  return res.json();
}

export const api = {
  locations: {
    list: () => request<LocationWithGrades[]>("/api/locations"),
    get: (id: string) => request<LocationWithGrades>(`/api/locations/${id}`),
    create: (data: Partial<Location>) =>
      request<Location>("/api/locations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Location>) =>
      request<Location>(`/api/locations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/api/locations/${id}`, { method: "DELETE" }),
  },
  products: {
    list: () => request<Product[]>("/api/products"),
    rankings: (productId: string) =>
      request<{
        product: Product;
        ranked: {
          locationId: string;
          locationName: string;
          address: string;
          unitsSold: number;
          grade: "A" | "B" | "C";
          shareOfLocation: number;
        }[];
      }>(`/api/products/${productId}/rankings`),
  },
  sales: {
    log: (data: { locationId: string; entries: { productId: string; unitsSold: number }[]; note?: string }) =>
      request<{ created: number }>("/api/sales", { method: "POST", body: JSON.stringify(data) }),
  },
  routes: {
    list: () => request<Route[]>("/api/routes"),
    get: (id: string) => request<Route>(`/api/routes/${id}`),
    create: (data: { name?: string; driverName?: string; locationIds: string[]; startPoint?: { lat: number; lng: number } }) =>
      request<Route & { usedFallback: boolean }>("/api/routes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { status?: string; name?: string; driverName?: string }) =>
      request<Route>(`/api/routes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/api/routes/${id}`, { method: "DELETE" }),
    reorder: (id: string, stopIds: string[]) =>
      request<Route>(`/api/routes/${id}/reorder`, { method: "POST", body: JSON.stringify({ stopIds }) }),
    updateStop: (routeId: string, stopId: string, data: { status?: string; visitNotes?: string }) =>
      request(`/api/routes/${routeId}/stops/${stopId}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  geocode: (query: string) =>
    request<{ address: string; lat: number; lng: number }>(`/api/geocode?q=${encodeURIComponent(query)}`),
  dashboard: () =>
    request<{
      todaysRoute: Route | null;
      totalLocations: number;
      flaggedCount: number;
      flagged: { locationId: string; locationName: string; productName: string; unitsSold: number }[];
    }>("/api/dashboard"),
};
