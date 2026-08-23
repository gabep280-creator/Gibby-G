import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachGradesToRoute } from "@/lib/queries";

/**
 * Manual drag-to-reorder. Body: { stopIds: string[] } in the new desired
 * order. Distance/duration-from-previous figures become stale once a
 * driver manually reorders (they reflect the optimizer's original legs),
 * so we clear them rather than show numbers that no longer match the
 * sequence.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { stopIds } = (await request.json()) as { stopIds: string[] };

  if (!Array.isArray(stopIds) || stopIds.length === 0) {
    return NextResponse.json({ error: "stopIds must be a non-empty array." }, { status: 400 });
  }

  const existing = await prisma.routeStop.findMany({ where: { routeId: id } });
  if (existing.length !== stopIds.length || !existing.every((s) => stopIds.includes(s.id))) {
    return NextResponse.json(
      { error: "stopIds must match exactly the stops currently on this route." },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    stopIds.map((stopId, sequence) =>
      prisma.routeStop.update({
        where: { id: stopId },
        data: {
          sequence,
          distanceFromPrevMeters: null,
          durationFromPrevSeconds: null,
        },
      })
    )
  );

  const route = await prisma.route.findUniqueOrThrow({
    where: { id },
    include: { stops: { orderBy: { sequence: "asc" }, include: { location: true } } },
  });

  return NextResponse.json(await attachGradesToRoute(route));
}
