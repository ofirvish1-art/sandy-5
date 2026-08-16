"use client"

import { ArrowLeft, SlidersHorizontal, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { useListings } from "@/components/listings-provider"
import { BottomSheet } from "./bottom-sheet"
import {
  countActiveFilters,
  EMPTY_FILTERS,
  type Listing,
  type ListingFilters,
  type ListingStatus,
  listingMatchesFilters,
} from "./data"
import { EditListingModal } from "./edit-listing-modal"
import { FilterSheet } from "./filter-sheet"
import { ListingCard } from "./listing-card"

type Segment = "all" | "supply" | "demand" | "mine"

export function AdsScreen({
  onOpenListing,
  onNotify,
  initialFocus,
  initialSegment = "all",
}: {
  onOpenListing: (l: Listing) => void
  onNotify?: (msg: string) => void
  initialFocus?: "inprogress"
  initialSegment?: Segment
}) {
  const [segment, setSegment] = useState<Segment>(initialSegment)
  const [filters, setFilters] = useState<ListingFilters>(EMPTY_FILTERS)
  const [specificDate, setSpecificDate] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [editing, setEditing] = useState<Listing | null>(null)
  const [allMatchesOpen, setAllMatchesOpen] = useState(false)
  const [inProgressOnly, setInProgressOnly] = useState(initialFocus === "inprogress")

  const { listings: allListings, opportunities, loading, error, setStatus, replaceListing } = useListings()

  const activeFilters = countActiveFilters(filters)

  const listings = useMemo(() => {
    return allListings
      .filter((l) => {
        if (segment === "mine") {
          if (l.owner !== "me") return false
        } else if (segment !== "all" && l.type !== segment) {
          return false
        }
        if (!listingMatchesFilters(l, filters, specificDate)) return false
        if (inProgressOnly && !l.inProgress) return false
        return true
      })
  }, [allListings, segment, filters, specificDate, inProgressOnly])

  // Ranked by match score against the user's own listings, not by recency.
  const matched = opportunities

  const segments: { key: Segment; label: string }[] = [
    { key: "all", label: "הכל" },
    { key: "supply", label: "מציעים" },
    { key: "demand", label: "מבקשים" },
    { key: "mine", label: "המודעות שלי" },
  ]

  return (
    <div className="space-y-5 px-5 py-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
            activeFilters > 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-foreground"
          }`}
        >
          <SlidersHorizontal className="size-4" />
          סינון
          {activeFilters > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-white/25 text-xs">
              {activeFilters}
            </span>
          )}
        </button>
        <h2 className="text-lg font-extrabold text-foreground">מודעות</h2>
      </div>

      {/* In-progress focus banner (from the "מודעות בתהליך" dashboard metric) */}
      {inProgressOnly && (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-sage-soft px-4 py-2.5 text-right">
          <button
            type="button"
            onClick={() => setInProgressOnly(false)}
            className="rounded-full bg-card px-3 py-1 text-xs font-bold text-primary"
          >
            הצג הכל
          </button>
          <p className="text-sm font-bold text-primary">מציג מודעות בתהליך בלבד</p>
        </div>
      )}

      {/* Segment toggle */}
      <div className="flex rounded-2xl bg-muted p-1">
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSegment(s.key)}
            className={`flex-1 whitespace-nowrap rounded-xl px-1 py-2 text-[13px] font-bold transition-colors ${
              segment === s.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Prominent "matched for you" hero card (#8 & #9) */}
      {matched.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-primary p-5 text-right text-primary-foreground shadow-lg shadow-primary/20">
          <span className="absolute -left-6 -top-6 size-24 rounded-full bg-sage/20" />
          <span className="absolute -bottom-8 -right-4 size-24 rounded-full bg-sage/10" />
          <div className="relative">
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sage">
                מודעות מתאימות לך
              </span>
              <Sparkles className="size-4 text-sage" />
            </div>

            <button
              type="button"
              onClick={() => onOpenListing(matched[0].listing)}
              className="mt-3 flex w-full items-center justify-between gap-3 transition-transform active:scale-[0.98]"
            >
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-sage px-3 py-1.5 text-sm font-extrabold text-sage-foreground">
                <ArrowLeft className="size-4" />
                {matched[0].percent}% התאמה
              </span>
              <div className="min-w-0 text-right">
                <h3 className="truncate text-xl font-extrabold">{matched[0].listing.material}</h3>
                <p className="truncate text-sm text-primary-foreground/80">
                  {matched[0].listing.quantity} קוב · {matched[0].listing.city} ·{" "}
                  {matched[0].listing.ownerName}
                </p>
              </div>
            </button>

            {matched.length > 1 && (
              <button
                type="button"
                onClick={() => setAllMatchesOpen(true)}
                className="mt-3 w-full border-t border-white/10 pt-2 text-right text-xs font-bold text-sage underline-offset-2 hover:underline"
              >
                ועוד {matched.length - 1} מודעות שתואמות לפעילות שלך — הצג הכל
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feed */}
      <section className="space-y-3">
        {loading && <p className="py-8 text-center text-sm text-muted-foreground">טוען מודעות…</p>}

        {!loading && error && (
          <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-bold text-destructive">
            {error}
          </p>
        )}

        {!loading && !error && listings.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {activeFilters > 0 ? "לא נמצאו מודעות התואמות לסינון." : "אין עדיין מודעות להצגה."}
          </p>
        )}

        {listings.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            onOpen={onOpenListing}
            onEdit={setEditing}
            onStatusChange={async (id, status) => {
              const failure = await setStatus(id, status)
              onNotify?.(failure ?? "סטטוס המודעה עודכן")
            }}
          />
        ))}
      </section>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onChange={setFilters}
        resultCount={listings.length}
        specificDate={specificDate}
        onSpecificDateChange={setSpecificDate}
      />

      {/* All matching listings (#4) */}
      <BottomSheet
        open={allMatchesOpen}
        onClose={() => setAllMatchesOpen(false)}
        title={`מודעות מתאימות לך (${matched.length})`}
      >
        <div className="space-y-3">
          {matched.map((m) => (
            <button
              key={m.listing.id}
              type="button"
              onClick={() => {
                setAllMatchesOpen(false)
                onOpenListing(m.listing)
              }}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 text-right transition-colors hover:bg-accent"
            >
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  m.band === "high"
                    ? "bg-success/15 text-success"
                    : m.band === "medium"
                      ? "bg-warning/20 text-[oklch(0.45_0.1_85)]"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {m.percent}%
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-foreground">
                  {m.listing.material} · {m.listing.quantity} קוב
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.listing.city} · {m.listing.ownerName} ·{" "}
                  {m.listing.price ? `₪${m.listing.price} / קוב` : m.listing.priceLabel}
                </p>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>

      <EditListingModal
        listing={editing}
        onClose={() => setEditing(null)}
        onSave={replaceListing}
        onNotify={onNotify}
      />
    </div>
  )
}
