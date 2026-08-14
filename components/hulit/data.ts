export const BRAND = {
  he: "סנדיט",
  en: "SANDIT",
  tagline: "יש עפר? צריך עפר? נפגשים בסנדיט.",
} as const

/* -------------------------------------------------------------------------- */
/*  Full legal text — shared by the registration screen and the profile page  */
/* -------------------------------------------------------------------------- */

export type LegalSection = { heading?: string; body: string[] }

export const LEGAL_TERMS: LegalSection[] = [
  { body: ["עודכן לאחרונה: 10/08/2026"] },
  {
    body: [
      `ברוכים הבאים ל${BRAND.he}! ${BRAND.he} היא פלטפורמה דיגיטלית המאפשרת יצירת קשר בין בעלי עודפי עפר, חומרי מילוי, חומרי חפירה וחומרי גלם דומים לבין גורמים המעוניינים לקבל, לרכוש או להשתמש בחומרים אלו. השימוש בפלטפורמה מהווה הסכמה מלאה לתנאי שימוש אלו.`,
    ],
  },
  {
    heading: "1. מהות השירות",
    body: [
      `${BRAND.he} מהווה זירת מידע ותיווך טכנולוגית בלבד. ${BRAND.he} אינה מוכרת, רוכשת, מובילה, משנעת, מאחסנת, מחזיקה או בודקת את החומרים המתפרסמים על ידי המשתמשים. כל התקשרות, משא ומתן, תיאום או עסקה מתבצעים ישירות בין המשתמשים ועל אחריותם הבלעדית.`,
    ],
  },
  {
    heading: "2. הרשמה למערכת",
    body: [
      "בעת ההרשמה המשתמש מצהיר ומתחייב כי: הוא בן 18 ומעלה; הפרטים שמסר נכונים, מלאים ומדויקים; הוא רשאי להשתמש בפרטים שמסר; יעדכן את פרטיו במקרה של שינוי; ולא יתחזה לכל אדם או גוף אחר.",
      `${BRAND.he} רשאית לחסום, להגביל או למחוק חשבון משתמש שהפר תנאים אלו.`,
    ],
  },
  {
    heading: "3. פרסום מודעות",
    body: [
      "המשתמש מתחייב לפרסם מידע נכון ומדויק ככל הניתן לגבי: סוג החומר, כמות החומר, מקור החומר, מיקום החומר, מועדי פינוי או אספקה, ותנאים מיוחדים הקשורים לחומר. חל איסור לפרסם מידע כוזב, מטעה או חלקי באופן העלול להטעות משתמשים אחרים.",
    ],
  },
  {
    heading: "4. חומרים אסורים לפרסום",
    body: [
      "חל איסור לפרסם באמצעות הפלטפורמה: פסולת מסוכנת, פסולת רעילה, אסבסט, פסולת רפואית, פסולת תעשייתית אסורה, קרקע או חומר מזוהם, חומרים שהעברתם, פינוים או שימושם אסורים לפי דין, וכל חומר הדורש רישוי מיוחד שאינו בידי המפרסם. המפרסם אחראי באופן בלעדי לוודא כי החומר המפורסם על ידו עומד בדרישות החוק.",
    ],
  },
  {
    heading: "5. אחריות המשתמשים",
    body: [
      "כל משתמש אחראי בעצמו לכל פעולה שיבצע באמצעות הפלטפורמה, כולל: בדיקת איכות החומר, בדיקת מקור החומר, בדיקת התאמת החומר לצרכיו, קבלת אישורים והיתרים נדרשים, ביצוע בדיקות סביבתיות, הובלה ופריקה, תשלומים והתקשרויות חוזיות.",
    ],
  },
  {
    heading: "6. עסקאות ותשלומים",
    body: [
      `${BRAND.he} אינה צד לעסקאות בין המשתמשים. ${BRAND.he} אינה אחראית לביצוע העסקה, לאי ביצוע העסקה, להעברת תשלומים, לאי תשלום, לביטול עסקה, למחלוקות מסחריות או להפסדים כספיים.`,
    ],
  },
  {
    heading: "7. הובלה ושינוע",
    body: [
      `${BRAND.he} אינה מספקת שירותי הובלה. כל האחריות להובלה, העמסה, פריקה, תיאום לוגיסטי, קבלת אישורים וביצוע העבודות חלה על המשתמשים בלבד.`,
    ],
  },
  {
    heading: "8. מידע המפורסם בפלטפורמה",
    body: [
      `${BRAND.he} אינה בודקת באופן שוטף את המידע המפורסם על ידי משתמשים, ולפיכך אין באפשרותה להבטיח את נכונות המידע, איכות החומרים, הכמות המוצהרת, זמינות החומר או מהימנות המשתמשים.`,
    ],
  },
  {
    heading: "9. הגבלת אחריות",
    body: [
      `השימוש בפלטפורמה נעשה על אחריות המשתמש בלבד. ${BRAND.he}, בעליה, מנהליה, עובדיה וספקיה לא יהיו אחראים לכל נזק ישיר או עקיף הנובע משימוש במערכת, הסתמכות על מידע, התקשרות בין משתמשים, איכות/מקור החומר, הובלה/פריקה, אובדן הכנסות, נזק סביבתי או רכושי.`,
    ],
  },
  {
    heading: "10. דיווח על תוכן מפר",
    body: [
      `כל משתמש רשאי לדווח על תוכן מטעה, שימוש בלתי חוקי, פרסום חומר אסור, התחזות או הטרדה. ${BRAND.he} רשאית להסיר תוכן לפי שיקול דעתה הבלעדי.`,
    ],
  },
  {
    heading: "11. סיום שימוש",
    body: [
      `${BRAND.he} רשאית להגביל או להפסיק את השימוש של משתמש בכל עת במקרה של הפרת תנאי השימוש, מסירת מידע כוזב, פעילות בלתי חוקית, חשד להונאה או פגיעה במשתמשים.`,
    ],
  },
  {
    heading: "12. קניין רוחני",
    body: [
      `כל הזכויות באפליקציה, בטכנולוגיה, בעיצוב, בלוגו, במאגרי המידע ובתכנים הייחודיים שייכות ל${BRAND.he} בלבד.`,
    ],
  },
  {
    heading: "13. הדין החל",
    body: [
      "על תנאים אלו יחולו דיני מדינת ישראל בלבד. סמכות השיפוט הבלעדית תהיה לבתי המשפט המוסמכים במחוז תל אביב.",
    ],
  },
]

export const LEGAL_PRIVACY: LegalSection[] = [
  {
    heading: "1. כללי",
    body: [
      `${BRAND.he} מכבדת את פרטיות המשתמשים. השימוש באפליקציה מהווה הסכמה למדיניות זו.`,
    ],
  },
  {
    heading: "2. המידע שאנו אוספים",
    body: [
      'שם מלא, שם חברה, טלפון, דוא"ל, פרטי מודעות, מיקום החומר/פרויקט, נתוני שימוש, כתובת IP ומידע טכני.',
    ],
  },
  {
    heading: "3. מטרות איסוף המידע",
    body: [
      "ניהול חשבון, הצגת מודעות, יצירת קשר, שיפור השירות, תמיכה, מניעת הונאות ואבטחה.",
    ],
  },
  {
    heading: "4. הצגת פרטי קשר",
    body: ["מפרסם מודעה מאשר כי פרטי הקשר שלו יוצגו למשתמשים אחרים לצורך יצירת קשר."],
  },
  {
    heading: "5. הצגת מיקום",
    body: ["הצגת עיר/אזור/מיקום מקורב במפה. כתובת מדויקת תפורסם רק מבחירה."],
  },
  {
    heading: "6. העברת מידע לצדדים שלישיים",
    body: [
      "לא נמכור מידע. העברה תתבצע רק לפי חוק, צו שיפוטי, הגנה על זכויות או מיזוג/רכישה.",
    ],
  },
  {
    heading: "7. אבטחת מידע",
    body: ["מופעלים אמצעי אבטחה מקובלים להגנה על המידע."],
  },
  {
    heading: "8. מחיקת מידע",
    body: ["ניתן לבקש מחיקת חשבון, מודעות או מידע אישי במייל/טלפון."],
  },
  {
    heading: "9. יצירת קשר",
    body: ["yuval29.4.2001@gmail.com | 054-7397021"],
  },
]

export const LEGAL_ABOUT = `${BRAND.he} היא זירת המסחר הראשונה בישראל לעודפי עפר וחומרי מילוי. המערכת מחברת בין אתרי בנייה, קבלנים, יזמים, מובילים ולקוחות המעוניינים לאתר, למסור, לרכוש או לקבל עודפי עפר וחומרי מילוי בצורה פשוטה, מהירה ויעילה.`

export type ListingType = "supply" | "demand"
export type ListingStatus = "relevant" | "closing" | "closed"

export const MATERIAL_OPTIONS = [
  "חמרה נקייה",
  "חול מנופה",
  "חול טבעי",
  "חול צנרת",
  "חול שליכט",
  "אדמה שחורה",
  "מצע א'",
  "מצע ג'",
  "שומשום לריצוף",
  "שומשומית דקה",
  "מילוי לא נקי",
  "אחר",
] as const

export const PRICE_OPTIONS = [
  'מחיר לקוב',
  "מחיר גמיש",
  "חינם",
  "ייקבע בהמשך",
] as const

export const TIMING_OPTIONS = ["היום", "מחר", "השבוע", "תאריך ספציפי"] as const

export const TRANSPORT_OPTIONS = ["אני אקח", "אתה תיקח", "תיאום בהמשך"] as const

export const LOADING_OPTIONS = ["אני מעמיס", "אתה מעמיס", "תיאום בהמשך"] as const

export const STATUS_LABELS: Record<ListingStatus, string> = {
  relevant: "רלוונטי",
  closing: "בתהליך סגירה",
  closed: "נסגר",
}

export type Listing = {
  id: string
  type: ListingType
  material: string
  quantity: number
  priceLabel: string
  price?: number
  city: string
  /** Null until we know where the viewer is — never a placeholder number. */
  distanceKm: number | null
  timing: string
  transport: string
  loading: string
  owner: string
  ownerName: string
  status: ListingStatus
  matched?: boolean
  createdAt: string
  details?: string
  mapX?: number
  mapY?: number
  lat?: number
  lng?: number
  /** Present on every listing loaded from Supabase (see ListingWithContact). */
  contactPhone?: string
  ownerUserId?: string
  availableUntil?: string | null
  deadline?: string | null
  images?: string[]
}

export type MapPin = {
  id: string
  type: ListingType
  /** Percentage offsets from the pre-Leaflet static map. Unused by MapView. */
  x?: number
  y?: number
  lat: number
  lng: number
  label: string
  listing?: Listing
}

// Derive map pins from listings so the map shares the exact same data (and filters).
export function listingsToPins(listings: Listing[]): MapPin[] {
  return listings
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({
      id: `pin-${l.id}`,
      type: l.type,
      x: l.mapX,
      y: l.mapY,
      lat: l.lat as number,
      lng: l.lng as number,
      label: l.material,
      listing: l,
    }))
}


/* -------------------------------------------------------------------------- */
/*  Shared multi-select filters — SAME categories as the publishing wizard    */
/* -------------------------------------------------------------------------- */

export type ListingFilters = {
  materials: string[]
  prices: string[]
  timings: string[]
  transports: string[]
  loadings: string[]
}

export const EMPTY_FILTERS: ListingFilters = {
  materials: [],
  prices: [],
  timings: [],
  transports: [],
  loadings: [],
}

// Filter groups, mirroring the wizard steps exactly.
export const FILTER_GROUPS = [
  { key: "materials" as const, label: "סוג חומר", options: MATERIAL_OPTIONS.filter((m) => m !== "אחר") },
  { key: "prices" as const, label: "מחיר", options: PRICE_OPTIONS },
  { key: "timings" as const, label: "עיתוי", options: TIMING_OPTIONS },
  { key: "transports" as const, label: "הובלה", options: TRANSPORT_OPTIONS },
  { key: "loadings" as const, label: "העמסה", options: LOADING_OPTIONS },
]

export function countActiveFilters(f: ListingFilters): number {
  return f.materials.length + f.prices.length + f.timings.length + f.transports.length + f.loadings.length
}

/**
 * A listing passes when, for every active category, its value is among the
 * selected options.
 *
 * `specificDate` answers "what can I get by this date?" — so a listing passes
 * when its own date falls on or before the one picked. Listings with no
 * explicit date (היום / מחר / השבוע) are resolved to an approximate date so
 * they aren't unfairly excluded.
 */
export function listingMatchesFilters(
  l: Listing,
  f: ListingFilters,
  specificDate?: string,
): boolean {
  if (f.materials.length && !f.materials.includes(l.material)) return false
  if (f.prices.length && !f.prices.includes(l.priceLabel)) return false
  if (f.timings.length && !f.timings.includes(l.timing)) return false
  if (f.transports.length && !f.transports.includes(l.transport)) return false
  if (f.loadings.length && !f.loadings.includes(l.loading)) return false

  if (specificDate && f.timings.includes("תאריך ספציפי")) {
    const effective = effectiveDate(l)
    if (!effective || effective > specificDate) return false
  }

  return true
}

const TIMING_DAY_OFFSETS: Record<string, number> = {
  היום: 0,
  מחר: 1,
  השבוע: 7,
}

/** The date a listing is actually available by, as YYYY-MM-DD. */
export function effectiveDate(l: Listing): string | null {
  const explicit = l.availableUntil ?? l.deadline
  if (explicit) return explicit.slice(0, 10)

  const offset = TIMING_DAY_OFFSETS[l.timing]
  if (offset === undefined) return null

  const d = new Date()
  d.setDate(d.getDate() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}