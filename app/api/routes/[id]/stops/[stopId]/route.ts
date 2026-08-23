import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stopId: string }> }
) {
  const { id, stopId } = await params;
  const body = await request.json();
  const { status, visitNotes } = body as { status?: string; visitNotes?: string };

  const data: Record<string, unknown> = {};
  if (status !== undefined) {
    data.status = status;
    if (status === "completed") data.completedAt = new Date();
  }
  if (visitNotes !== undefined) data.visitNotes = visitNotes;

  try {
    const stop = await prisma.routeStop.update({
      where: { id: stopId, routeId: id },
      data,
      include: { location: true },
    });
    return NextResponse.json(stop);
  } catch {
    return NextResponse.json({ error: "Stop not found." }, { status: 404 });
  }
}
