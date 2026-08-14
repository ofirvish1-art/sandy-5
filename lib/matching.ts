// Fuzzy multi-factor matching engine.
//
// Ported from the previous version of the site (lib/matching.js) — the weights,
// thresholds and bands are unchanged, so matches stay consistent with what
// users saw before the redesign. The v0 export shipped a simpler scorer that
// worked on display labels; this one scores the real database values.
//
// Material AND logistics are strict gates — a mismatch on either means "not a
// match at all", not just a lower score. Everything else (quantity, location,
// timing) is scored and blended into 0–100.

import { haversineKm } from "@/lib/cities"
import type { ListingWithContact } from "@/lib/supabase/listings"

const URGENCY_DAYS_FROM_NOW: Record<string, number> = {
  now: 0,
  today: 0,
  tomorrow: 1,
  week: 4,
  future: 10,
}

export type MatchBand = "high" | "medium" | "low"

export type MatchScore = {
  score: MatchBand
  percent: number
  quantityFulfilledPercent: number
  distanceKm: number | null
}

function approxDateDays(listing: ListingWithContact): number {
  const explicit = listing.availableUntil || listing.deadline
  if (explicit) {
    return Math.round((new Date(explicit).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }
  return URGENCY_DAYS_FROM_NOW[listing.urgency] ?? 10
}

function distanceBetween(a: ListingWithContact, b: ListingWithContact): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null
  return haversineKm(a.lat, a.lng, b.lat, b.lng)
}

/** How much of the demand the supply can actually cover. Directional on purpose. */
function quantityScore(supply: ListingWithContact, demand: ListingWithContact): number {
  if (!demand.quantity) return 0
  return Math.max(0, Math.min(1, supply.quantity / demand.quantity))
}

function locationScore(supply: ListingWithContact, demand: ListingWithContact): number {
  const dist = distanceBetween(supply, demand)
  // No coordinates on one side — neither reward nor punish it.
  if (dist === null) return 0.5
  if (dist <= 40) return 1
  if (dist >= 80) return 0
  return 1 - (dist - 40) / 40
}

function timingScore(supply: ListingWithContact, demand: ListingWithContact): number {
  const diffDays = Math.abs(approxDateDays(supply) - approxDateDays(demand))
  if (diffDays <= 7) return 1
  if (diffDays >= 21) return 0
  return 1 - (diffDays - 7) / 14
}

// Both sides store transport in the same absolute frame (who hauls), so the
// same value on both means they agree. "flexible" (coordinate later) is
// compatible with anything.
function logisticsCompatible(supply: ListingWithContact, demand: ListingWithContact): boolean {
  return (
    supply.dbTransport === "flexible" ||
    demand.dbTransport === "flexible" ||
    supply.dbTransport === demand.dbTransport
  )
}

/** Returns null when the pair fails a strict gate. */
export function scoreMatch(
  supply: ListingWithContact,
  demand: ListingWithContact,
): MatchScore | null {
  if (!supply.material || supply.material !== demand.material) return null
  if (!logisticsCompatible(supply, demand)) return null

  const q = quantityScore(supply, demand)
  const l = locationScore(supply, demand)
  const t = timingScore(supply, demand)

  const composite = Math.round(q * 40 + l * 35 + t * 25)

  let band: MatchBand = "low"
  if (composite >= 70) band = "high"
  else if (composite >= 45) band = "medium"

  return {
    score: band,
    percent: composite,
    quantityFulfilledPercent: Math.round(q * 100),
    distanceKm: distanceBetween(supply, demand),
  }
}

export type Match = MatchScore & {
  supply: ListingWithContact
  demand: ListingWithContact
}

export function buildMatches(
  supplyListings: ListingWithContact[],
  demandListings: ListingWithContact[],
): Match[] {
  const matches: Match[] = []
  for (const s of supplyListings) {
    for (const d of demandListings) {
      const result = scoreMatch(s, d)
      if (result) matches.push({ supply: s, demand: d, ...result })
    }
  }
  matches.sort((a, b) => b.percent - a.percent)
  return matches
}

export const INSTANT_ALERT_THRESHOLD = 70

/* -------------------------------------------------------------------------- */
/*  "Matched for you"                                                         */
/* -------------------------------------------------------------------------- */

/** Closed listings are done — they shouldn't surface as opportunities. */
function isLive(l: ListingWithContact): boolean {
  return l.status !== "closed"
}

export type MatchesForUser = {
  /** Other people's listings that match something of mine, best score first. */
  opportunities: { listing: ListingWithContact; percent: number; band: MatchBand }[]
  /** Every listing id involved in a match, for the card's "matched" flag. */
  matchedIds: Set<string>
}

/**
 * Finds listings belonging to other people that match one of *my* listings.
 * This is what the "מודעות מתאימות לך" panel shows: with no listings of your
 * own there is nothing to match against, so it returns empty.
 */
export function findMatchesForUser(
  listings: ListingWithContact[],
  userId: string | null,
): MatchesForUser {
  const empty: MatchesForUser = { opportunities: [], matchedIds: new Set() }
  if (!userId) return empty

  const live = listings.filter(isLive)
  const mine = live.filter((l) => l.owner === "me")
  const theirs = live.filter((l) => l.owner !== "me")
  if (mine.length === 0 || theirs.length === 0) return empty

  // Best score per counterpart listing, so one listing can't appear twice.
  const best = new Map<string, { listing: ListingWithContact; percent: number; band: MatchBand }>()
  const matchedIds = new Set<string>()

  for (const m of mine) {
    for (const other of theirs) {
      if (m.type === other.type) continue
      const supply = m.type === "supply" ? m : other
      const demand = m.type === "supply" ? other : m

      const result = scoreMatch(supply, demand)
      if (!result) continue

      matchedIds.add(m.id)
      matchedIds.add(other.id)

      const existing = best.get(other.id)
      if (!existing || result.percent > existing.percent) {
        best.set(other.id, { listing: other, percent: result.percent, band: result.score })
      }
    }
  }

  return {
    opportunities: [...best.values()].sort((a, b) => b.percent - a.percent),
    matchedIds,
  }
}
