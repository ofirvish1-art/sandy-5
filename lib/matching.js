// Matching logic — mirrors section 10 of the spec:
//   High:   same material, <=20km, near-term timing, supply covers >=70% of demand
//   Medium: same material, <=50km, near-term timing, partial quantity
//   Low:    everything else that still shares a material family

const URGENCY_RANK = { now: 0, today: 1, tomorrow: 2, week: 3, future: 4 };

export function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v === null || v === undefined)) {
    return null;
  }
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timingIsClose(supply, demand) {
  const s = URGENCY_RANK[supply.urgency] ?? 4;
  const d = URGENCY_RANK[demand.urgency] ?? 4;
  return Math.abs(s - d) <= 1;
}

export function scoreMatch(supply, demand) {
  if (supply.material_type !== demand.material_type) return null;

  const distanceKm = haversineKm(
    supply.latitude,
    supply.longitude,
    demand.latitude,
    demand.longitude
  );

  const coverage =
    demand.quantity_cubic > 0
      ? supply.quantity_cubic / demand.quantity_cubic
      : 0;

  const closeTiming = timingIsClose(supply, demand);
  const dist = distanceKm ?? 9999;

  let score = "low";
  if (dist <= 20 && closeTiming && coverage >= 0.7) {
    score = "high";
  } else if (dist <= 50 && coverage > 0) {
    score = "medium";
  }

  return { score, distanceKm: distanceKm === null ? null : Math.round(distanceKm) };
}

export function buildMatches(supplyListings, demandListings) {
  const matches = [];
  for (const s of supplyListings) {
    for (const d of demandListings) {
      const result = scoreMatch(s, d);
      if (result) {
        matches.push({
          supply: s,
          demand: d,
          score: result.score,
          distanceKm: result.distanceKm,
        });
      }
    }
  }
  // Highest-value matches first
  const order = { high: 0, medium: 1, low: 2 };
  matches.sort((a, b) => order[a.score] - order[b.score]);
  return matches;
}
