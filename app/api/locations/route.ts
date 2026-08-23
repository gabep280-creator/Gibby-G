import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAllLocationGrades } from "@/lib/queries";

export async function GET() {
  const [locations, grades] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    computeAllLocationGrades(),
  ]);

  const withGrades = locations.map((loc) => ({
    ...loc,
    grades: grades.get(loc.id) ?? [],
  }));

  return NextResponse.json(withGrades);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, address, lat, lng, storeType, notes, contactName, contactPhone, contactEmail, visitFrequency } = body;

  if (!name || !address || typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "name, address, lat, and lng are required." },
      { status: 400 }
    );
  }

  const location = await prisma.location.create({
    data: {
      name,
      address,
      lat,
      lng,
      storeType: storeType || null,
      notes: notes || null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      visitFrequency: visitFrequency || null,
    },
  });

  return NextResponse.json(location, { status: 201 });
}
