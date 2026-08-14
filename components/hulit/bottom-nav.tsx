"use client"

import { CalendarDays, Home, Map, Package, Search, Truck, User } from "lucide-react"
import type { ListingType } from "./data"

export type TabKey = "home" | "ads" | "calendar" | "map" | "profile"

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "בית", icon: Home },
  { key: "ads", label: "מודעות", icon: Search },
  { key: "calendar", label: "יומן", icon: CalendarDays },
  { key: "map", label: "מפה", icon: Map },
  { key: "profile", label: "פרופיל", icon: User },
]

export function BottomNav({
  active,
  onChange,
  onCompose,
}: {
  active: TabKey
  onChange: (t: TabKey) => void
  onCompose: (type: ListingType) => void
}) {
  // Floating action buttons appear only on secondary tabs, never on Home (#12).
  const showFabs = active !== "home"

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md">
      {/* Floating action buttons — positioned above the nav bar with clear spacing */}
      {showFabs && (
        <div className="pointer-events-none relative">
          <div className="pointer-events-auto absolute -top-20 left-1/2 flex -translate-x-1/2 items-end gap-6">
            <button
              type="button"
              onClick={() => onCompose("demand")}
              className="flex flex-col items-center gap-1"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95">
                <Package className="size-6" />
              </span>
              <span className="text-xs font-bold text-foreground">לקחת</span>
            </button>
            <button
              type="button"
              onClick={() => onCompose("supply")}
              className="flex flex-col items-center gap-1"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-sage text-sage-foreground shadow-lg shadow-sage/40 ring-4 ring-background transition-transform active:scale-95">
                <Truck className="size-6" />
              </span>
              <span className="text-xs font-bold text-foreground">לתת</span>
            </button>
          </div>
        </div>
      )}

      {/* Nav bar */}
      <nav className="pointer-events-auto rounded-t-3xl border-t border-border bg-card px-3 pb-5 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
        <ul className="flex items-end justify-between">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = active === tab.key
            return (
              <li key={tab.key} className="flex-1">
                <button
                  type="button"
                  onClick={() => onChange(tab.key)}
                  className="flex w-full flex-col items-center gap-1"
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={`size-6 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span
                    className={`text-[11px] transition-colors ${isActive ? "font-bold text-primary" : "text-muted-foreground"}`}
                  >
                    {tab.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
