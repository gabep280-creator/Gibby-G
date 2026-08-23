/**
 * A/B/C grading logic for how a flavor is performing at a given location.
 *
 * The grade compares a product's units sold at a location against the
 * OTHER products sold at that same location (relative performance), not
 * against a fixed global threshold — a store that sells everything well
 * still needs to know which flavor is its weakest.
 *
 * Deliberately modular: `gradeLocationProducts` takes a strategy so the
 * rule can be tuned later without touching call sites.
 */

export type Grade = "A" | "B" | "C";

export type ProductTotal = {
  productId: string;
  unitsSold: number;
};

export type GradeResult = {
  productId: string;
  unitsSold: number;
  grade: Grade;
  shareOfLocation: number; // 0..1, this product's share of total units sold at the location
};

export type GradingStrategy = (totals: ProductTotal[]) => Map<string, Grade>;

/**
 * Default strategy: rank products at a location by units sold and grade by
 * share relative to the top seller there.
 *   - top seller and anything within 66% of it -> A
 *   - anything within 33% of the top seller -> B
 *   - everything else -> C
 * A location with a single product (or no sales at all) defaults to "C" so
 * it still surfaces as needing attention rather than being hidden.
 */
export const RELATIVE_SHARE_STRATEGY: GradingStrategy = (totals) => {
  const grades = new Map<string, Grade>();
  const max = Math.max(0, ...totals.map((t) => t.unitsSold));

  for (const t of totals) {
    if (max <= 0) {
      grades.set(t.productId, "C");
      continue;
    }
    const ratio = t.unitsSold / max;
    if (ratio >= 0.66) grades.set(t.productId, "A");
    else if (ratio >= 0.33) grades.set(t.productId, "B");
    else grades.set(t.productId, "C");
  }

  return grades;
};

export function gradeLocationProducts(
  totals: ProductTotal[],
  strategy: GradingStrategy = RELATIVE_SHARE_STRATEGY
): GradeResult[] {
  const grades = strategy(totals);
  const totalUnits = totals.reduce((sum, t) => sum + t.unitsSold, 0);

  return totals.map((t) => ({
    productId: t.productId,
    unitsSold: t.unitsSold,
    grade: grades.get(t.productId) ?? "C",
    shareOfLocation: totalUnits > 0 ? t.unitsSold / totalUnits : 0,
  }));
}

/** Worst grade across a location's products — used to color map pins so a
 * driver can spot a store needing attention at a glance, regardless of
 * which flavor is dragging it down. Returns null when there's no sales
 * data yet (pin should render as "no data" rather than implying a C). */
export function worstGrade(grades: { grade: Grade }[]): Grade | null {
  if (grades.length === 0) return null;
  if (grades.some((g) => g.grade === "C")) return "C";
  if (grades.some((g) => g.grade === "B")) return "B";
  return "A";
}

export const GRADE_COLORS: Record<Grade, { bg: string; text: string; ring: string }> = {
  A: { bg: "bg-emerald-500", text: "text-emerald-50", ring: "ring-emerald-600" },
  B: { bg: "bg-amber-400", text: "text-amber-950", ring: "ring-amber-500" },
  C: { bg: "bg-rose-500", text: "text-rose-50", ring: "ring-rose-600" },
};
