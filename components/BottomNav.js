"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/supply", label: "יש לי לתת", icon: "▲" },
  { href: "/demand", label: "אני צריך", icon: "▼" },
  { href: "/matches", label: "התאמות", icon: "◆" },
  { href: "/timeline", label: "תכנון קדימה", icon: "▤" },
  { href: "/map", label: "מפה", icon: "●" },
  { href: "/profile", label: "פרופיל", icon: "◐" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-20
                 bg-stone-900 text-stone-50 z-40 flex md:flex-col
                 justify-around md:justify-start md:pt-6 md:gap-1
                 border-t md:border-t-0 md:border-s border-stone-800"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 md:py-3 text-[11px] font-semibold flex-1 md:flex-none
              ${active ? "text-brand-400" : "text-stone-300"}`}
          >
            <span className={`text-lg leading-none ${active ? "text-brand-400" : "text-stone-400"}`}>
              {item.icon}
            </span>
            <span className="leading-tight text-center">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
