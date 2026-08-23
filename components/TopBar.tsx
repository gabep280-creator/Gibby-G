"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map & Routes" },
  { href: "/locations", label: "Stores" },
  { href: "/rankings", label: "Rankings" },
];

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="hidden sm:flex items-center gap-6 border-b border-zinc-200 bg-white px-6 py-3">
      <span className="font-bold tracking-tight text-zinc-900">
        Noah&apos;s <span className="text-emerald-600">Pork Rinds</span>
      </span>
      <nav className="flex gap-1">
        {LINKS.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
