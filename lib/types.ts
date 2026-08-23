import type { Grade } from "@/lib/grading";

export type { Grade };

// These mirror the Prisma models but describe the shape returned by our API
// routes after JSON serialization (Date -> ISO string), which is what
// client components actually consume.

export type ProductGrade = {
  productId: string;
  sku: string;
  name: string;
  unitsSold: number;
  grade: Grade;
  shareOfLocation: number;
};

export type Location = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  storeType: string | null;
  notes: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  visitFrequency: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocationWithGrades = Location & { grades: ProductGrade[] };

export type Product = {
  id: string;
  sku: string;
  name: string;
  isActive: boolean;
  createdAt: string;
};

export type RouteStop = {
  id: string;
  routeId: string;
  locationId: string;
  sequence: number;
  status: "pending" | "completed" | "skipped";
  arrivedAt: string | null;
  completedAt: string | null;
  distanceFromPrevMeters: number | null;
  durationFromPrevSeconds: number | null;
  photoUrl: string | null;
  signatureUrl: string | null;
  visitNotes: string | null;
  location: LocationWithGrades;
};

export type Route = {
  id: string;
  name: string;
  date: string;
  driverName: string | null;
  status: "planned" | "in_progress" | "completed";
  totalDistanceMeters: number | null;
  totalDurationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  stops: RouteStop[];
};
