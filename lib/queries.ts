import { prisma } from "@/lib/prisma";
import { gradeLocationProducts, type GradeResult } from "@/lib/grading";

export type ProductGrade = GradeResult & { sku: string; name: string };

/**
 * Computes A/B/C grades for every product at every location from raw
 * SalesRecord totals. Grades are always derived on read, never stored, so
 * tuning `lib/grading.ts` changes results immediately without a migration
 * or backfill.
 */
export async function computeAllLocationGrades(): Promise<
  Map<string, ProductGrade[]>
> {
  const [products, totals] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true } }),
    prisma.salesRecord.groupBy({
      by: ["locationId", "productId"],
      _sum: { unitsSold: true },
    }),
  ]);

  const byLocation = new Map<string, Map<string, number>>();
  for (const row of totals) {
    if (!byLocation.has(row.locationId)) byLocation.set(row.locationId, new Map());
    byLocation
      .get(row.locationId)!
      .set(row.productId, row._sum.unitsSold ?? 0);
  }

  const result = new Map<string, ProductGrade[]>();
  for (const [locationId, productTotals] of byLocation) {
    const totalsForGrading = products.map((p) => ({
      productId: p.id,
      unitsSold: productTotals.get(p.id) ?? 0,
    }));
    const graded = gradeLocationProducts(totalsForGrading);
    result.set(
      locationId,
      graded.map((g) => {
        const product = products.find((p) => p.id === g.productId)!;
        return { ...g, sku: product.sku, name: product.name };
      })
    );
  }

  return result;
}

export async function computeLocationGrades(
  locationId: string
): Promise<ProductGrade[]> {
  const all = await computeAllLocationGrades();
  return all.get(locationId) ?? [];
}

type RouteStopWithLocation = { location: { id: string } & Record<string, unknown> } & Record<
  string,
  unknown
>;
type RouteWithStops<T extends RouteStopWithLocation> = { stops: T[] } & Record<string, unknown>;

/** Attaches computed grades onto each stop's `location.grades` so route
 * views (map pins, stop list) can show flavor performance without a
 * second round trip. */
export async function attachGradesToRoute<T extends RouteStopWithLocation>(
  route: RouteWithStops<T>
) {
  const grades = await computeAllLocationGrades();
  return {
    ...route,
    stops: route.stops.map((stop) => ({
      ...stop,
      location: { ...stop.location, grades: grades.get(stop.location.id) ?? [] },
    })),
  };
}
