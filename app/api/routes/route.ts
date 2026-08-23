import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { optimizeRoute, type LatLng } from "@/lib/mapbox";
import { attachGradesToRoute } from "@/lib/queries";

export async function GET() {
  const routes = await prisma.route.findMany({
    orderBy: { date: "desc" },
    include: {
      stops: {
        orderBy: { sequence: "asc" },
        include: { location: true },
      },
    },
  });
  const withGrades = await Promise.all(routes.map(attachGradesToRoute));
  return NextResponse.json(withGrades);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    name,
    driverName,
    locationIds,
    startPoint,
  }: { name?: string; driverName?: string; locationIds: string[]; startPoint?: LatLng } = body;

  if (!Array.isArray(locationIds) || locationIds.length === 0) {
    return NextResponse.json(
      { error: "locationIds must be a non-empty array." },
      { status: 400 }
    );
  }

  const locations = await prisma.location.findMany({
    where: { id: { in: locationIds } },
  });
  if (locations.length === 0) {
    return NextResponse.json({ error: "No matching locations found." }, { status: 404 });
  }
  // Preserve the caller's requested order for locations (Mapbox reorders anyway).
  const orderedLocations = locationIds
    .map((id) => locations.find((l) => l.id === id))
    .filter((l): l is (typeof locations)[number] => Boolean(l));

  const points: LatLng[] = startPoint
    ? [startPoint, ...orderedLocations.map((l) => ({ lat: l.lat, lng: l.lng }))]
    : orderedLocations.map((l) => ({ lat: l.lat, lng: l.lng }));

  const optimized = await optimizeRoute(points);

  // If we prepended a virtual startPoint, drop it from the stop list but
  // keep its leg distance/duration attributed to the first real stop.
  const offset = startPoint ? 1 : 0;
  const stopEntries = optimized.stops
    .filter((s) => s.index >= offset)
    .map((s, i) => ({
      location: orderedLocations[s.index - offset],
      sequence: i,
      distanceFromPrevMeters: s.distanceFromPrevMeters,
      durationFromPrevSeconds: s.durationFromPrevSeconds,
    }));

  const route = await prisma.route.create({
    data: {
      name: name || `Route ${new Date().toLocaleDateString()}`,
      driverName: driverName || null,
      totalDistanceMeters: optimized.totalDistanceMeters,
      totalDurationSeconds: optimized.totalDurationSeconds,
      stops: {
        create: stopEntries.map((s) => ({
          locationId: s.location.id,
          sequence: s.sequence,
          distanceFromPrevMeters: s.distanceFromPrevMeters,
          durationFromPrevSeconds: s.durationFromPrevSeconds,
        })),
      },
    },
    include: { stops: { orderBy: { sequence: "asc" }, include: { location: true } } },
  });

  const withGrades = await attachGradesToRoute(route);
  return NextResponse.json(
    { ...withGrades, usedFallback: optimized.usedFallback },
    { status: 201 }
  );
}
