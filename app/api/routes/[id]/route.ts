import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachGradesToRoute } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const route = await prisma.route.findUnique({
    where: { id },
    include: { stops: { orderBy: { sequence: "asc" }, include: { location: true } } },
  });
  if (!route) {
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  }
  return NextResponse.json(await attachGradesToRoute(route));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status, name, driverName } = body;

  try {
    const route = await prisma.route.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(name !== undefined && { name }),
        ...(driverName !== undefined && { driverName }),
      },
      include: { stops: { orderBy: { sequence: "asc" }, include: { location: true } } },
    });
    return NextResponse.json(await attachGradesToRoute(route));
  } catch {
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.route.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  }
}
