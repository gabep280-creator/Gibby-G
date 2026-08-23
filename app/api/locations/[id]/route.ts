import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeLocationGrades } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }
  const grades = await computeLocationGrades(id);
  return NextResponse.json({ ...location, grades });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const {
    name,
    address,
    lat,
    lng,
    storeType,
    notes,
    contactName,
    contactPhone,
    contactEmail,
    visitFrequency,
  } = body;

  try {
    const location = await prisma.location.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(lat !== undefined && { lat }),
        ...(lng !== undefined && { lng }),
        ...(storeType !== undefined && { storeType }),
        ...(notes !== undefined && { notes }),
        ...(contactName !== undefined && { contactName }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(visitFrequency !== undefined && { visitFrequency }),
      },
    });
    return NextResponse.json(location);
  } catch {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }
}
