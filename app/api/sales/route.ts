import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const locationId = request.nextUrl.searchParams.get("locationId");
  const records = await prisma.salesRecord.findMany({
    where: locationId ? { locationId } : undefined,
    include: { product: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { locationId, entries, note } = body as {
    locationId: string;
    entries: { productId: string; unitsSold: number }[];
    note?: string;
  };

  if (!locationId || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json(
      { error: "locationId and a non-empty entries array are required." },
      { status: 400 }
    );
  }

  const valid = entries.filter(
    (e) => e.productId && Number.isFinite(e.unitsSold) && e.unitsSold >= 0
  );
  if (valid.length === 0) {
    return NextResponse.json(
      { error: "No valid sales entries were provided." },
      { status: 400 }
    );
  }

  const created = await prisma.salesRecord.createMany({
    data: valid.map((e) => ({
      locationId,
      productId: e.productId,
      unitsSold: Math.round(e.unitsSold),
      note: note || null,
    })),
  });

  return NextResponse.json({ created: created.count }, { status: 201 });
}
