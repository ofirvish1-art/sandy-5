// Structured Israeli city data: { cityName, lat, lng, region }.
// Not exhaustive — covers major cities/towns across all regions, enough
// for a real pilot. Add more entries here anytime the same shape.
export const CITIES = [
  { cityName: "תל אביב-יפו", lat: 32.0853, lng: 34.7818, region: "מרכז" },
  { cityName: "ירושלים", lat: 31.7683, lng: 35.2137, region: "ירושלים והסביבה" },
  { cityName: "חיפה", lat: 32.7940, lng: 34.9896, region: "צפון" },
  { cityName: "ראשון לציון", lat: 31.9730, lng: 34.8066, region: "מרכז" },
  { cityName: "פתח תקווה", lat: 32.0878, lng: 34.8878, region: "מרכז" },
  { cityName: "אשדוד", lat: 31.8044, lng: 34.6553, region: "דרום" },
  { cityName: "נתניה", lat: 32.3215, lng: 34.8532, region: "מרכז" },
  { cityName: "באר שבע", lat: 31.2530, lng: 34.7915, region: "דרום" },
  { cityName: "בני ברק", lat: 32.0807, lng: 34.8338, region: "מרכז" },
  { cityName: "חולון", lat: 32.0117, lng: 34.7736, region: "מרכז" },
  { cityName: "רמת גן", lat: 32.0684, lng: 34.8248, region: "מרכז" },
  { cityName: "אשקלון", lat: 31.6693, lng: 34.5715, region: "דרום" },
  { cityName: "רחובות", lat: 31.8928, lng: 34.8113, region: "מרכז" },
  { cityName: "בת ים", lat: 32.0171, lng: 34.7502, region: "מרכז" },
  { cityName: "בית שמש", lat: 31.7500, lng: 34.9885, region: "ירושלים והסביבה" },
  { cityName: "כפר סבא", lat: 32.1750, lng: 34.9070, region: "מרכז" },
  { cityName: "הרצליה", lat: 32.1663, lng: 34.8434, region: "מרכז" },
  { cityName: "חדרה", lat: 32.4340, lng: 34.9196, region: "מרכז" },
  { cityName: "מודיעין-מכבים-רעות", lat: 31.8928, lng: 35.0095, region: "מרכז" },
  { cityName: "נצרת", lat: 32.6996, lng: 35.3035, region: "צפון" },
  { cityName: "רמלה", lat: 31.9276, lng: 34.8625, region: "מרכז" },
  { cityName: "רעננה", lat: 32.1848, lng: 34.8713, region: "מרכז" },
  { cityName: "לוד", lat: 31.9518, lng: 34.8942, region: "מרכז" },
  { cityName: "נהריה", lat: 33.0084, lng: 35.0951, region: "צפון" },
  { cityName: "גבעתיים", lat: 32.0723, lng: 34.8125, region: "מרכז" },
  { cityName: "הוד השרון", lat: 32.1500, lng: 34.8898, region: "מרכז" },
  { cityName: "כפר יונה", lat: 32.3169, lng: 34.9328, region: "מרכז" },
  { cityName: "קריית אתא", lat: 32.8064, lng: 35.1042, region: "צפון" },
  { cityName: "קריית גת", lat: 31.6100, lng: 34.7642, region: "דרום" },
  { cityName: "אילת", lat: 29.5577, lng: 34.9519, region: "דרום" },
  { cityName: "עפולה", lat: 32.6078, lng: 35.2897, region: "צפון" },
  { cityName: "רמת השרון", lat: 32.1467, lng: 34.8394, region: "מרכז" },
  { cityName: "טבריה", lat: 32.7959, lng: 35.5310, region: "צפון" },
  { cityName: "נס ציונה", lat: 31.9292, lng: 34.7970, region: "מרכז" },
  { cityName: "יבנה", lat: 31.8783, lng: 34.7392, region: "מרכז" },
  { cityName: "אור יהודה", lat: 32.0292, lng: 34.8544, region: "מרכז" },
  { cityName: "גני תקווה", lat: 32.0611, lng: 34.8564, region: "מרכז" },
  { cityName: "צפת", lat: 32.9648, lng: 35.4960, region: "צפון" },
  { cityName: "דימונה", lat: 31.0687, lng: 35.0330, region: "דרום" },
  { cityName: "אריאל", lat: 32.1057, lng: 35.1747, region: "יהודה ושומרון" },
  { cityName: "מעלה אדומים", lat: 31.7728, lng: 35.2972, region: "יהודה ושומרון" },
  { cityName: "קריית מלאכי", lat: 31.7304, lng: 34.7460, region: "דרום" },
  { cityName: "שדרות", lat: 31.5257, lng: 34.5958, region: "דרום" },
  { cityName: "עכו", lat: 32.9281, lng: 35.0819, region: "צפון" },
  { cityName: "כרמיאל", lat: 32.9169, lng: 35.2950, region: "צפון" },
  { cityName: "יקנעם עילית", lat: 32.6595, lng: 35.1108, region: "צפון" },
  { cityName: "נתיבות", lat: 31.4222, lng: 34.5892, region: "דרום" },
  { cityName: "אופקים", lat: 31.3134, lng: 34.6198, region: "דרום" },
  { cityName: "בית שאן", lat: 32.4969, lng: 35.4989, region: "צפון" },
  { cityName: "מגדל העמק", lat: 32.6742, lng: 35.2379, region: "צפון" },
];

// Simple prefix/substring search — no external API, works offline.
export function searchCities(query) {
  const q = (query || "").trim();
  if (!q) return [];
  return CITIES.filter((c) => c.cityName.includes(q)).slice(0, 8);
}
