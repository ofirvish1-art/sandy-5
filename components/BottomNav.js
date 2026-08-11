"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, CalendarDays, Map, User, Truck, Package } from "lucide-react";
import { useWizard } from "@/contexts/WizardContext";

// Matches the video reference's nav: בית / התאמות / לוח משימות / מפה / פרופיל,
// with two elevated FAB shortcuts (לתת / לקחת) sitting in the middle.
// Per spec item 12, the FABs are hidden on the home screen — home already
// has its own big "יש לי לתת" / "אני צריך" cards for the same actions.
const ITEMS = [
  { href: "/", label: "בית", Icon: Home },
  { href: "/matches", label: "התאמות", Icon: Search },
  { href: "/calendar", label: "לוח משימות", Icon: CalendarDays },
];
const ITEMS_END = [
  { href: "/map", label: "מפה", Icon: Map },
  { href: "/profile", label: "פרופיל", Icon: User },
];

function NavLink({ href, label, Icon, active }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 md:py-3 text-[10px] font-semibold flex-1 md:flex-none
        ${active ? "text-sage" : "text-cream/60"}`}
    >
      <Icon size={19} strokeWidth={2.25} />
      <span className="leading-tight text-center whitespace-nowrap">{label}</span>
    </Link>
  );
}

function FabButton({ onClick, label, Icon, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 flex-1 md:flex-none -mt-6 md:mt-0"
    >
      <span
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center border-4 border-olive-night
          ${tone === "give" ? "bg-sage text-olive-night" : "bg-olive-night text-sage"}`}
      >
        <Icon size={20} strokeWidth={2.25} />
      </span>
      <span className="text-[10px] font-semibold text-cream/80 leading-tight">{label}</span>
    </button>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { openWizard } = useWizard();
  if (pathname === "/register") return null;
  const showFabs = pathname !== "/";

  return (
    <nav
      className="fixed bottom-0 inset-x-0 md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-20
                 bg-olive-night text-cream z-40 flex md:flex-col items-end md:items-stretch
                 justify-around md:justify-start md:pt-6 md:gap-1
                 border-t md:border-t-0 md:border-s border-olive-light/30"
    >
      {ITEMS.map((item) => (
        <NavLink key={item.href} {...item} active={pathname === item.href} />
      ))}

      {showFabs && (
        <>
          <FabButton onClick={() => openWizard("demand")} label="לקחת" Icon={Package} tone="take" />
          <FabButton onClick={() => openWizard("supply")} label="לתת" Icon={Truck} tone="give" />
        </>
      )}

      {ITEMS_END.map((item) => (
        <NavLink key={item.href} {...item} active={pathname === item.href} />
      ))}
    </nav>
  );
}
