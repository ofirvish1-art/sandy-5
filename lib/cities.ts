// Structured Israeli city data: { cityName, lat, lng, region }.
//
// Ported from the previous version of the site. Not exhaustive — covers major
// cities/towns across all regions, enough for a real pilot. The redesign's
// wizard originally shipped with a 10-city stub and no regions; this replaces
// it so `listings.region` can actually be populated.

export type City = {
  cityName: string
  lat: number
  lng: number
  region: string
}

export const CITIES: City[] = [
  { cityName: "תל אביב-יפו", lat: 32.0853, lng: 34.7818, region: "מרכז" },
  { cityName: "ירושלים", lat: 31.7683, lng: 35.2137, region: "ירושלים והסביבה" },
  { cityName: "חיפה", lat: 32.794, lng: 34.9896, region: "צפון" },
  { cityName: "ראשון לציון", lat: 31.973, lng: 34.8066, region: "מרכז" },
  { cityName: "פתח תקווה", lat: 32.0878, lng: 34.8878, region: "מרכז" },
  { cityName: "אשדוד", lat: 31.8044, lng: 34.6553, region: "דרום" },
  { cityName: "נתניה", lat: 32.3215, lng: 34.8532, region: "מרכז" },
  { cityName: "באר שבע", lat: 31.253, lng: 34.7915, region: "דרום" },
  { cityName: "בני ברק", lat: 32.0807, lng: 34.8338, region: "מרכז" },
  { cityName: "חולון", lat: 32.0117, lng: 34.7736, region: "מרכז" },
  { cityName: "רמת גן", lat: 32.0684, lng: 34.8248, region: "מרכז" },
  { cityName: "אשקלון", lat: 31.6693, lng: 34.5715, region: "דרום" },
  { cityName: "רחובות", lat: 31.8928, lng: 34.8113, region: "מרכז" },
  { cityName: "בת ים", lat: 32.0171, lng: 34.7502, region: "מרכז" },
  { cityName: "בית שמש", lat: 31.75, lng: 34.9885, region: "ירושלים והסביבה" },
  { cityName: "כפר סבא", lat: 32.175, lng: 34.907, region: "מרכז" },
  { cityName: "הרצליה", lat: 32.1663, lng: 34.8434, region: "מרכז" },
  { cityName: "חדרה", lat: 32.434, lng: 34.9196, region: "מרכז" },
  { cityName: "מודיעין-מכבים-רעות", lat: 31.8928, lng: 35.0095, region: "מרכז" },
  { cityName: "נצרת", lat: 32.6996, lng: 35.3035, region: "צפון" },
  { cityName: "רמלה", lat: 31.9276, lng: 34.8625, region: "מרכז" },
  { cityName: "רעננה", lat: 32.1848, lng: 34.8713, region: "מרכז" },
  { cityName: "לוד", lat: 31.9518, lng: 34.8942, region: "מרכז" },
  { cityName: "נהריה", lat: 33.0084, lng: 35.0951, region: "צפון" },
  { cityName: "גבעתיים", lat: 32.0723, lng: 34.8125, region: "מרכז" },
  { cityName: "הוד השרון", lat: 32.15, lng: 34.8898, region: "מרכז" },
  { cityName: "כפר יונה", lat: 32.3169, lng: 34.9328, region: "מרכז" },
  { cityName: "קריית אתא", lat: 32.8064, lng: 35.1042, region: "צפון" },
  { cityName: "קריית גת", lat: 31.61, lng: 34.7642, region: "דרום" },
  { cityName: "אילת", lat: 29.5577, lng: 34.9519, region: "דרום" },
  { cityName: "עפולה", lat: 32.6078, lng: 35.2897, region: "צפון" },
  { cityName: "רמת השרון", lat: 32.1467, lng: 34.8394, region: "מרכז" },
  { cityName: "טבריה", lat: 32.7959, lng: 35.531, region: "צפון" },
  { cityName: "נס ציונה", lat: 31.9292, lng: 34.797, region: "מרכז" },
  { cityName: "יבנה", lat: 31.8783, lng: 34.7392, region: "מרכז" },
  { cityName: "אור יהודה", lat: 32.0292, lng: 34.8544, region: "מרכז" },
  { cityName: "גני תקווה", lat: 32.0611, lng: 34.8564, region: "מרכז" },
  { cityName: "צפת", lat: 32.9648, lng: 35.496, region: "צפון" },
  { cityName: "דימונה", lat: 31.0687, lng: 35.033, region: "דרום" },
  { cityName: "אריאל", lat: 32.1057, lng: 35.1747, region: "יהודה ושומרון" },
  { cityName: "מעלה אדומים", lat: 31.7728, lng: 35.2972, region: "יהודה ושומרון" },
  { cityName: "קריית מלאכי", lat: 31.7304, lng: 34.746, region: "דרום" },
  { cityName: "שדרות", lat: 31.5257, lng: 34.5958, region: "דרום" },
  { cityName: "עכו", lat: 32.9281, lng: 35.0819, region: "צפון" },
  { cityName: "כרמיאל", lat: 32.9169, lng: 35.295, region: "צפון" },
  { cityName: "יקנעם עילית", lat: 32.6595, lng: 35.1108, region: "צפון" },
  { cityName: "נתיבות", lat: 31.4222, lng: 34.5892, region: "דרום" },
  { cityName: "אופקים", lat: 31.3134, lng: 34.6198, region: "דרום" },
  { cityName: "בית שאן", lat: 32.4969, lng: 35.4989, region: "צפון" },
  { cityName: "מגדל העמק", lat: 32.6742, lng: 35.2379, region: "צפון" },
]

/** Simple substring search — no external API, works offline. */
export function searchCities(query: string): City[] {
  const q = query.trim()
  if (!q) return []
  return CITIES.filter((c) => c.cityName.includes(q)).slice(0, 8)
}

export function findCity(cityName: string): City | undefined {
  return CITIES.find((c) => c.cityName === cityName)
}

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Nearest known city to a raw GPS fix — used to label "use my location". */
export function nearestCity(lat: number, lng: number): City {
  let best = CITIES[0]
  let bestDist = Number.POSITIVE_INFINITY
  for (const c of CITIES) {
    const d = haversineKm(lat, lng, c.lat, c.lng)
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  return best
}
