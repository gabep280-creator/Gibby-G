import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAllLocationGrades } from "@/lib/queries";

export async function GET() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [todaysRoute, grades, totalLocations] = await Promise.all([
    prisma.route.findFirst({
      where: { date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { createdAt: "desc" },
      include: { stops: { orderBy: { sequence: "asc" }, include: { location: true } } },
    }),
    computeAllLocationGrades(),
    prisma.location.count(),
  ]);

  const flagged: {
    locationId: string;
    locationName: string;
    productName: string;
    unitsSold: number;
  }[] = [];

  const locations = await prisma.location.findMany({
    where: { id: { in: [...grades.keys()] } },
  });
  const locationById = new Map(locations.map((l) => [l.id, l]));

  for (const [locationId, productGrades] of grades) {
    const location = locationById.get(locationId);
    if (!location) continue;
    for (const g of productGrades) {
      if (g.grade === "C") {
        flagged.push({
          locationId,
          locationName: location.name,
          productName: g.name,
          unitsSold: g.unitsSold,
        });
      }
    }
  }

  return NextResponse.json({
    todaysRoute,
    totalLocations,
    flaggedCount: flagged.length,
    flagged: flagged.slice(0, 20),
  });
}
