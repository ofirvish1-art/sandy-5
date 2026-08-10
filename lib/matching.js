// Fuzzy multi-factor matching engine (Hulit upgrade spec, item 18).
//
// Material is a strict gate: different materials never match, full stop.
// Everything else is scored and combined into a 0–100 composite:
//   - Quantity coverage (flexible): how much of the demand the supply covers
//   - Location (flexible radius): full credit inside 40km, tapering to 0 by 80km
//   - Timing (flexible window): full credit if within 7 days of each other
//   - Transport/loading complementarity: bonus if the two sides' stated
//     preferences actually fit together (e.g. "I load" + "you load" is a
//     conflict, "I load" + "coordinate later" is fine)

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
  if (explicit) {
    return Math.round((new Date(explicit) - new Date()) / (1000 * 60 * 60 * 24));
  }
  return URGENCY_DAYS_FROM_NOW[listing.urgency] ?? 10;
}

function quantityScore(supply, demand) {
  if (!demand.quantity_cubic) return 0;
  const coverage = supply.quantity_cubic / demand.quantity_cubic;
  return Math.max(0, Math.min(1, coverage)); // 0–1, 1 = fully covers demand
}

function locationScore(supply, demand) {
  const dist = haversineKm(supply.latitude, supply.longitude, demand.latitude, demand.longitude);
  if (dist === null) return 0.5; // unknown coordinates — neutral, don't penalize or reward
  if (dist <= 40) return 1;
  if (dist >= 80) return 0;
  return 1 - (dist - 40) / 40; // linear taper 40km→80km
}

function timingScore(supply, demand) {
  const diffDays = Math.abs(approxDateDays(supply) - approxDateDays(demand));
  if (diffDays <= 7) return 1;
  if (diffDays >= 21) return 0;
  return 1 - (diffDays - 7) / 14;
}

// Complementary transport/loading: each side names who takes on the role.
// "flexible" (coordinate later) always fits. Two sides both claiming the
// SAME active role (both say "I'll bring it") is a soft conflict.
function logisticsScore(supply, demand) {
  const transportOk = supply.transport === "flexible" || demand.transport === "flexible" || supply.transport !== demand.transport;
  const loadingOk = supply.has_loading !== demand.has_loading || supply.has_loading == null || demand.has_loading == null;
  return (transportOk ? 0.5 : 0.2) + (loadingOk ? 0.5 : 0.2);
}

// Weighted composite → 0-100. Weights: quantity 35, location 30, timing 20, logistics 15.
export function scoreMatch(supply, demand) {
  if (!supply.material_type || supply.material_type !== demand.material_type) return null;

  const q = quantityScore(supply, demand);
  const l = locationScore(supply, demand);
  const t = timingScore(supply, demand);
  const g = logisticsScore(supply, demand);

  const composite = Math.round(q * 35 + l * 30 + t * 20 + g * 15);

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

// Threshold above which item 5 (instant WhatsApp match alert) fires.
export const INSTANT_ALERT_THRESHOLD = 70;
