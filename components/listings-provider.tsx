"use client"

// One fetch of the real listings, shared by every screen that shows them
// (home metrics + embedded map, the ads feed, the full map, the calendar).
// Replaces the LISTINGS mock array that the v0 export shipped with.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import type { ListingStatus } from "@/components/hulit/data"
import { haversineKm } from "@/lib/cities"
import { findMatchesForUser, type MatchBand } from "@/lib/matching"
import {
  fetchListings,
  updateListingStatus,
  type ListingWithContact,
} from "@/lib/supabase/listings"

export type ViewerCoords = { lat: number; lng: number }

type ListingsState = {
  /** Every listing, each flagged with whether it matches something of mine. */
  listings: ListingWithContact[]
  /** Other people's listings that match one of mine, best first. */
  opportunities: { listing: ListingWithContact; percent: number; band: MatchBand }[]
  /** The viewer's real device position, or null if unavailable/denied. */
  viewerCoords: ViewerCoords | null
  /** How many listings have no coordinates and therefore cannot be mapped. */
  withoutCoords: number
  loading: boolean
  error: string | null
  /** Re-reads everything from Supabase. */
  refresh: () => Promise<void>
  /** Drops a just-published listing in at the top without waiting for a round trip. */
  addListing: (listing: ListingWithContact) => void
  /** Swaps an edited listing in place, keeping its position in the feed. */
  replaceListing: (listing: ListingWithContact) => void
  /** Persists a status change, then reflects it locally. */
  setStatus: (id: string, status: ListingStatus) => Promise<string | null>
}

const ListingsContext = createContext<ListingsState | null>(null)

export function ListingsProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const userId = profile?.id ?? null

  const [listings, setListings] = useState<ListingWithContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewerCoords, setViewerCoords] = useState<ViewerCoords | null>(null)

  // Ask once, non-blocking. Distances stay hidden rather than guessed if the
  // user declines — a wrong "4 ק״מ" is worse than no number at all.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setViewerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setViewerCoords(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }, [])

  const refresh = useCallback(async () => {
    const result = await fetchListings({ userId })
    setListings(result.listings)
    setError(result.error)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addListing = useCallback((listing: ListingWithContact) => {
    setListings((prev) => [listing, ...prev.filter((l) => l.id !== listing.id)])
  }, [])

  const replaceListing = useCallback((listing: ListingWithContact) => {
    setListings((prev) => prev.map((l) => (l.id === listing.id ? listing : l)))
  }, [])

  const setStatus = useCallback(async (id: string, status: ListingStatus) => {
    const result = await updateListingStatus(id, status)
    if (!result.ok) return result.error
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
    return null
  }, [])

  // Matching runs client-side over the whole set, the same way the old site
  // did it — the `matches` table exists but was never populated.
  const { decorated, opportunities, withoutCoords } = useMemo(() => {
    const { opportunities: opps, matchedIds } = findMatchesForUser(listings, userId)
    return {
      decorated: listings.map((l) => ({
        ...l,
        matched: matchedIds.has(l.id),
        distanceKm:
          viewerCoords && l.lat != null && l.lng != null
            ? Math.round(haversineKm(viewerCoords.lat, viewerCoords.lng, l.lat, l.lng))
            : null,
      })),
      opportunities: opps,
      withoutCoords: listings.filter((l) => l.lat == null || l.lng == null).length,
    }
  }, [listings, userId, viewerCoords])

  const value = useMemo<ListingsState>(
    () => ({
      listings: decorated,
      opportunities,
      viewerCoords,
      withoutCoords,
      loading,
      error,
      refresh,
      addListing,
      replaceListing,
      setStatus,
    }),
    [
      decorated,
      opportunities,
      viewerCoords,
      withoutCoords,
      loading,
      error,
      refresh,
      addListing,
      replaceListing,
      setStatus,
    ],
  )

  return <ListingsContext.Provider value={value}>{children}</ListingsContext.Provider>
}

export function useListings(): ListingsState {
  const ctx = useContext(ListingsContext)
  if (!ctx) throw new Error("useListings must be used inside <ListingsProvider>")
  return ctx
}
