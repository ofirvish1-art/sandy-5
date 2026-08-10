"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Item 2: map removed from the bottom bar (it's embedded on the home
// screen instead). Labels renamed per the redesign spec.
const ITEMS = [
  { href: "/", label: "בית", icon: "🏠" },
  { href: "/matches", label: "מודעות", icon: "🔍" },
  { href: "/calendar", label: "יומן", icon: "📅" },
  { href: "/profile", label: "פרופיל", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/register") return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-20
                 bg-olive-night text-cream z-40 flex md:flex-col
                 justify-around md:justify-start md:pt-6 md:gap-1
                 border-t md:border-t-0 md:border-s border-olive-light/30"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 md:py-3 text-[11px] font-semibold flex-1 md:flex-none
              ${active ? "text-sage" : "text-cream/60"}`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="leading-tight text-center">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
