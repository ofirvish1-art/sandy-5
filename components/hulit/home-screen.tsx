"use client"

import { ArrowLeft, ClipboardCheck, Layers, ListChecks, MapPin } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useListings } from "@/components/listings-provider"
import { supabase } from "@/lib/supabase/client"
import type { TabKey } from "./bottom-nav"
import {
  EMPTY_FILTERS,
  type Listing,
  type ListingFilters,
  type ListingType,
  listingMatchesFilters,
  listingsToPins,
} from "./data"
import { FilterSheet } from "./filter-sheet"
import { MapView } from "./map-view"

/* Dashboard metrics, computed from the real listings (#10.A) */
function useMetrics(listings: Listing[]) {
  const { profile } = useAuth()
  const [calendarCount, setCalendarCount] = useState<number | null>(null)

  useEffect(() => {
    if (!profile) return
    let active = true
    supabase
      .from("calendar_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .then(({ count }) => {
        if (active) setCalendarCount(count ?? 0)
      })
    return () => {
      active = false
    }
  }, [profile])

  // מודעות באזור — listings that actually have coordinates to place on the map
  const onMap = listings.filter((l) => l.lat != null && l.lng != null).length
  // מודעות בתהליך — anything currently being handled
  const inProgress = listings.filter((l) => l.matched || l.status === "closing").length
  // המודעות שלי
  const mine = listings.filter((l) => l.owner === "me").length

  return { onMap, inProgress, mine, calendarCount }
}

function MetricCard({
  icon: Icon,
  value,
  title,
  sub,
  onClick,
}: {
  icon: typeof MapPin
  value: number
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center rounded-2xl bg-card p-2 text-center shadow-sm transition-transform active:scale-95"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-sage-soft text-primary">
        <Icon className="size-4" />
      </span>
      <span className="mt-1 text-xl font-extrabold leading-none text-foreground">{value}</span>
      <p className="mt-1 text-[11px] font-bold leading-tight text-foreground text-balance">{title}</p>
      <p className="text-[9px] leading-tight text-muted-foreground">{sub}</p>
    </button>
  )
}

export function HomeScreen({
  onCompose,
  onNavigate,
  onOpenListing,
}: {
  onCompose: (t: ListingType) => void
  onNavigate: (tab: TabKey, opts?: { focus?: "inprogress"; segment?: "mine" }) => void
  onOpenListing?: (l: Listing) => void
}) {
  const { listings, viewerCoords } = useListings()
  const { onMap, inProgress, mine, calendarCount } = useMetrics(listings)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<ListingFilters>(EMPTY_FILTERS)
  const [specificDate, setSpecificDate] = useState("")

  const mapPins = useMemo(
    () => listingsToPins(listings.filter((l) => listingMatchesFilters(l, filters, specificDate))),
    [listings, filters, specificDate],
  )

  // Each tile now reports the number its own title describes — the export had
  // the second and third values swapped relative to their labels.
  const metrics = [
    { icon: MapPin, value: onMap, title: "מודעות באזור", sub: "הובלה קצרה", go: () => onNavigate("map") },
    {
      icon: Layers,
      value: inProgress,
      title: "מודעות בתהליך",
      sub: "המשך טיפול",
      go: () => onNavigate("ads", { focus: "inprogress" }),
    },
    {
      icon: ClipboardCheck,
      value: mine,
      title: "המודעות שלי",
      sub: "בדוק סטטוס",
      go: () => onNavigate("ads", { segment: "mine" }),
    },
    {
      icon: ListChecks,
      value: calendarCount ?? 0,
      title: "אירועים ביומן",
      sub: "שים לב",
      go: () => onNavigate("calendar"),
    },
  ]

  return (
    <div className="space-y-4 px-5 py-5">
      <div>
        <h2 className="mb-2 text-right text-base font-extrabold text-foreground">מה קורה היום?</h2>
        {/* 4 metric cards in one horizontal row, each clickable (#10.A) */}
        <div className="grid grid-cols-4 gap-2">
          {metrics.map((m) => (
            <MetricCard
              key={m.title}
              icon={m.icon}
              value={m.value}
              title={m.title}
              sub={m.sub}
              onClick={m.go}
            />
          ))}
        </div>
      </div>

      {/* Compact action cards with scenic backgrounds — each spans 2 metric cards (#10.B) */}
      <div className="grid grid-cols-2 gap-3">
        {/* demand - wheel loader in a scenic landscape */}
        <button
          type="button"
          onClick={() => onCompose("demand")}
          className="relative flex h-24 flex-col justify-between overflow-hidden rounded-2xl p-3 text-right text-primary-foreground"
        >
          <img
            src="/sandit-loader-scenic.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-l from-primary/90 via-primary/70 to-primary/40" />
          <div className="relative z-10">
            <h3 className="text-base font-extrabold leading-tight">אני צריך</h3>
            <p className="text-[11px] text-primary-foreground/85">פרסם איזה חומר אתה צריך</p>
          </div>
          <span className="relative z-10 inline-flex items-center justify-center gap-1.5 self-end rounded-full bg-card px-3 py-1 text-xs font-bold text-foreground">
            בקש חומר  <ArrowLeft className="size-3.5" />
          </span>
        </button>

        {/* supply - truck in a scenic landscape */}
        <button
          type="button"
          onClick={() => onCompose("supply")}
          className="relative flex h-24 flex-col justify-between overflow-hidden rounded-2xl p-3 text-right text-sage-foreground"
        >
          <img
            src="/sandit-truck-scenic.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-l from-sage/90 via-sage/65 to-sage/30" />
          <div className="relative z-10">
            <h3 className="text-base font-extrabold leading-tight">יש לי לתת</h3>
            <p className="text-[11px] text-sage-foreground/85">פרסם חומר זמין</p>
          </div>
          <span className="relative z-10 inline-flex items-center justify-center gap-1.5 self-end rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            הצע חומר <ArrowLeft className="size-3.5" />
          </span>
        </button>
      </div>

      {/* Embedded map — gets the freed vertical space (#10.C) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => onNavigate("map")} className="text-sm font-bold text-primary">
            למפה המלאה
          </button>
          <h2 className="text-base font-extrabold text-foreground">מודעות באזור שלך</h2>
        </div>
        <MapView
          className="h-80"
          onOpenFilter={() => setFilterOpen(true)}
          onSelectListing={onOpenListing}
          pins={mapPins}
          myLocation={viewerCoords}
        />
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onChange={setFilters}
        resultCount={mapPins.length}
        specificDate={specificDate}
        onSpecificDateChange={setSpecificDate}
      />
    </div>
  )
}
