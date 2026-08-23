import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAllLocationGrades } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const [locations, grades] = await Promise.all([
    prisma.location.findMany(),
    computeAllLocationGrades(),
  ]);

  const ranked = locations
    .map((location) => {
      const g = grades.get(location.id)?.find((p) => p.productId === productId);
      return {
        locationId: location.id,
        locationName: location.name,
        address: location.address,
        unitsSold: g?.unitsSold ?? 0,
        grade: g?.grade ?? "C",
        shareOfLocation: g?.shareOfLocation ?? 0,
      };
    })
    .sort((a, b) => b.unitsSold - a.unitsSold);

  return NextResponse.json({ product, ranked });
}
