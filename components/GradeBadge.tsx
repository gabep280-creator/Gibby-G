import type { Grade } from "@/lib/types";

const STYLES: Record<Grade, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-amber-400 text-amber-950",
  C: "bg-rose-500 text-white",
};

const SIZES = {
  sm: "h-5 min-w-5 px-1 text-[11px]",
  md: "h-7 min-w-7 px-1.5 text-sm",
  lg: "h-9 min-w-9 px-2 text-base",
};

export default function GradeBadge({
  grade,
  size = "md",
}: {
  grade: Grade;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold leading-none shadow-sm ${STYLES[grade]} ${SIZES[size]}`}
    >
      {grade}
    </span>
  );
}
