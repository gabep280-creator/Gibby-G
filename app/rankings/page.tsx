"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import GradeBadge from "@/components/GradeBadge";
import type { Product } from "@/lib/types";

type Ranked = {
  locationId: string;
  locationName: string;
  address: string;
  unitsSold: number;
  grade: "A" | "B" | "C";
  shareOfLocation: number;
};

export default function RankingsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string | null>(null);
  const [ranked, setRanked] = useState<Ranked[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.products
      .list()
      .then((prods) => {
        setProducts(prods);
        if (prods[0]) setProductId(prods[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!productId) return;
    api.products.rankings(productId).then((r) => setRanked(r.ranked));
  }, [productId]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="pb-1 text-xl font-bold text-zinc-900">Flavor rankings</h1>
        <p className="pb-4 text-sm text-zinc-500">
          Every store, ranked by units sold of the selected flavor — spot your best and worst performers fast.
        </p>

        <div className="mb-4 flex gap-2 overflow-x-auto">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => setProductId(p.id)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${
                productId === p.id ? "bg-emerald-600 text-white" : "bg-white border border-zinc-200 text-zinc-700"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <ol className="space-y-2">
            {ranked.map((r, i) => (
              <li
                key={r.locationId}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3"
              >
                <span className="w-6 shrink-0 text-center text-sm font-bold text-zinc-400">{i + 1}</span>
                <GradeBadge grade={r.grade} />
                <Link href={`/locations/${r.locationId}/edit`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{r.locationName}</p>
                  <p className="truncate text-xs text-zinc-500">{r.address}</p>
                </Link>
                <span className="shrink-0 text-sm font-medium text-zinc-700">{r.unitsSold} bags</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
