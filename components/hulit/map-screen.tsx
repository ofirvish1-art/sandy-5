"use client"

import { SlidersHorizontal } from "lucide-react"
import { useMemo, useState } from "react"
import { useListings } from "@/components/listings-provider"
import {
  countActiveFilters,
  EMPTY_FILTERS,
  type Listing,
  type ListingFilters,
  listingMatchesFilters,
  listingsToPins,
} from "./data"
import { FilterSheet } from "./filter-sheet"
import { MapView } from "./map-view"
import { PostDetailModal } from "./post-detail-modal"

type MapType = "all" | "supply" | "demand"

export function MapScreen() {
  const [filterOpen, setFilterOpen] = useState(false)
  const [type, setType] = useState<MapType>("all")
  const [filters, setFilters] = useState<ListingFilters>(EMPTY_FILTERS)
  const [specificDate, setSpecificDate] = useState("")
  const [activeListing, setActiveListing] = useState<Listing | null>(null)

  const { listings, viewerCoords, withoutCoords, loading } = useListings()

  const activeFilters = countActiveFilters(filters)

  const filteredListings = useMemo(
    () =>
      listings.filter((l) => {
        if (type !== "all" && l.type !== type) return false
        return listingMatchesFilters(l, filters, specificDate)
      }),
    [listings, type, filters, specificDate],
  )

  const pins = useMemo(() => listingsToPins(filteredListings), [filteredListings])
  // Listings the current view would show but that have no coordinates to pin.
  const hiddenHere = filteredListings.length - pins.length

  const typeOptions: { key: MapType; label: string }[] = [
    { key: "all", label: "הכל" },
    { key: "supply", label: "מציעים" },
    { key: "demand", label: "מבקשים" },
  ]

  return (
    <div className="px-5 py-6">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
            activeFilters > 0 ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"
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
        <h2 className="text-lg font-extrabold text-foreground">מפת החומרים</h2>
      </div>

      {/* Type segment */}
      <div className="mb-3 flex rounded-2xl bg-muted p-1">
        {typeOptions.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setType(o.key)}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
              type === o.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <MapView
        className="h-[64vh]"
        onOpenFilter={() => setFilterOpen(true)}
        onSelectListing={setActiveListing}
        pins={pins}
        myLocation={viewerCoords}
      />

      {!loading && pins.length === 0 && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {filteredListings.length > 0
            ? "למודעות שנמצאו אין מיקום מדויק, ולכן אי אפשר להציג אותן על המפה."
            : "לא נמצאו מודעות לפי הסינון. נסה לשנות את המסננים."}
        </p>
      )}

      {/* Say plainly when the map is showing less than the feed does. */}
      {!loading && pins.length > 0 && hiddenHere > 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {hiddenHere} מודעות נוספות אינן מוצגות במפה — לא נשמר עבורן מיקום מדויק.
        </p>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onChange={setFilters}
        resultCount={filteredListings.length}
        specificDate={specificDate}
        onSpecificDateChange={setSpecificDate}
      />

      <PostDetailModal listing={activeListing} onClose={() => setActiveListing(null)} />
    </div>
  )
}
