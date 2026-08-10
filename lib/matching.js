// Fuzzy multi-factor matching engine.
//
// Material AND logistics are strict gates — a mismatch on either means
// "not a match at all", not just a lower score. Everything else
// (quantity, location, timing) is scored and blended into 0–100.

const URGENCY_DAYS_FROM_NOW = { now: 0, today: 0, tomorrow: 1, week: 4, future: 10 };

export function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v === null || v === undefined)) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function approxDateDays(listing) {
  const explicit = listing.available_until || listing.deadline;
  if (explicit) return Math.round((new Date(explicit) - new Date()) / (1000 * 60 * 60 * 24));
  return URGENCY_DAYS_FROM_NOW[listing.urgency] ?? 10;
}

function quantityScore(supply, demand) {
  if (!demand.quantity_cubic) return 0;
  return Math.max(0, Math.min(1, supply.quantity_cubic / demand.quantity_cubic));
}
function locationScore(supply, demand) {
  const dist = haversineKm(supply.latitude, supply.longitude, demand.latitude, demand.longitude);
  if (dist === null) return 0.5;
  if (dist <= 40) return 1;
  if (dist >= 80) return 0;
  return 1 - (dist - 40) / 40;
}
function timingScore(supply, demand) {
  const diffDays = Math.abs(approxDateDays(supply) - approxDateDays(demand));
  if (diffDays <= 7) return 1;
  if (diffDays >= 21) return 0;
  return 1 - (diffDays - 7) / 14;
}

// Same declared transport value on both sides means complementary intent
// (e.g. both say "buyer picks up"). Only a genuine mismatch — one side
// wanting one arrangement, the other wanting the opposite — is a conflict.
// "flexible" (coordinate later) is always compatible with anything.
function logisticsCompatible(supply, demand) {
  return supply.transport === "flexible" || demand.transport === "flexible" || supply.transport === demand.transport;
}

export function scoreMatch(supply, demand) {
  if (!supply.material_type || supply.material_type !== demand.material_type) return null; // strict
  if (!logisticsCompatible(supply, demand)) return null; // strict

  const q = quantityScore(supply, demand);
  const l = locationScore(supply, demand);
  const t = timingScore(supply, demand);

  const composite = Math.round(q * 40 + l * 35 + t * 25);

  let band = "low";
  if (composite >= 70) band = "high";
  else if (composite >= 45) band = "medium";

  return {
    score: band,
    percent: composite,
    quantityFulfilledPercent: Math.round(q * 100),
    distanceKm: haversineKm(supply.latitude, supply.longitude, demand.latitude, demand.longitude),
  };
}

export function buildMatches(supplyListings, demandListings) {
  const matches = [];
  for (const s of supplyListings) {
    for (const d of demandListings) {
      const result = scoreMatch(s, d);
      if (result) matches.push({ supply: s, demand: d, ...result });
    }
  }
  matches.sort((a, b) => b.percent - a.percent);
  return matches;
}

export const INSTANT_ALERT_THRESHOLD = 70;
