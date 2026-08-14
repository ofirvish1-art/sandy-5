// Reading and writing real listings.
//
// The redesign speaks Hebrew labels ("מחיר לקוב", "אני אקח"); the database
// speaks the enums the old site established ('perCubic', 'sellerHelps').
// Every translation lives here, in one place, so the screens never have to
// know about the database vocabulary and vice versa.
//
// Where the two disagree, the database wins — those columns already hold 10
// live rows written by the previous version of the site.

import { findCity, haversineKm } from "@/lib/cities"
import { supabase } from "./client"
import type {
  ListingRow,
  ListingStatus as DbStatus,
  ListingType,
  PriceType,
  Transport,
  Urgency,
} from "./types"
import type { Listing, ListingStatus as UiStatus } from "@/components/hulit/data"

/* -------------------------------------------------------------------------- */
/*  Vocabulary                                                                */
/* -------------------------------------------------------------------------- */

const PRICE_TO_DB: Record<string, PriceType> = {
  "מחיר לקוב": "perCubic",
  "מחיר גמיש": "flexible",
  חינם: "freePickup",
  "ייקבע בהמשך": "total",
}
const PRICE_TO_UI: Record<PriceType, string> = {
  perCubic: "מחיר לקוב",
  flexible: "מחיר גמיש",
  freePickup: "חינם",
  total: "ייקבע בהמשך",
}

const TIMING_TO_DB: Record<string, Urgency> = {
  היום: "today",
  מחר: "tomorrow",
  השבוע: "week",
  "תאריך ספציפי": "future",
}
const TIMING_TO_UI: Record<Urgency, string> = {
  now: "היום", // legacy value from the original schema
  today: "היום",
  tomorrow: "מחר",
  week: "השבוע",
  future: "תאריך ספציפי",
}

// Transport needs the listing TYPE to translate, because the two vocabularies
// use different frames of reference:
//
//   the database is absolute  — buyerPickup means "the buyer hauls", full stop
//   the new UI is speaker-relative — "אני אקח" means "whoever posted this hauls"
//
// So "אני אקח" is sellerHelps on a supply ad and buyerPickup on a demand ad.
// Getting this wrong silently inverts the logistics gate in the matcher: two
// listings that genuinely fit would look incompatible, and vice versa.
//
// The new wizard has no equivalent of the legacy 'needsTransport', so that
// value is read-only — displayed on old rows, never written.

function transportToDb(uiLabel: string, type: ListingType): Transport {
  if (uiLabel === "תיאום בהמשך") return "flexible"
  const publisherHauls = uiLabel === "אני אקח"
  const publisherIsSeller = type === "supply"
  // Whoever hauls, expressed from the buyer/seller frame the database uses.
  return publisherHauls === publisherIsSeller ? "sellerHelps" : "buyerPickup"
}

function transportToUi(dbValue: Transport, type: ListingType): string {
  if (dbValue === "flexible") return "תיאום בהמשך"
  if (dbValue === "needsTransport") return "צריך הובלה"
  const sellerHauls = dbValue === "sellerHelps"
  const publisherIsSeller = type === "supply"
  return sellerHauls === publisherIsSeller ? "אני אקח" : "אתה תיקח"
}

// Verified against the deployed check constraint by probing it directly: the
// live column accepts 'publisherHauls' / 'counterpartyLoads' / 'flexible'.
// The naming is inconsistent ("Hauls" on one side, "Loads" on the other) but
// the database is the source of truth, so the code matches it rather than the
// other way round.
export type DbLoading = "publisherHauls" | "counterpartyLoads" | "flexible"

const LOADING_TO_DB: Record<string, DbLoading> = {
  "אני מעמיס": "publisherHauls",
  "אתה מעמיס": "counterpartyLoads",
  "תיאום בהמשך": "flexible",
}
const LOADING_TO_UI: Record<string, string> = {
  publisherHauls: "אני מעמיס",
  publisherLoads: "אני מעמיס", // tolerated alias, in case rows were written with it
  counterpartyLoads: "אתה מעמיס",
  flexible: "תיאום בהמשך",
}

const STATUS_TO_DB: Record<UiStatus, DbStatus> = {
  relevant: "open",
  closing: "inTalks",
  closed: "closed",
}
// Several database statuses collapse onto the redesign's three chips.
const STATUS_TO_UI: Record<DbStatus, UiStatus> = {
  open: "relevant",
  inTalks: "closing",
  closed: "closed",
  notRelevant: "closed",
  cancelled: "closed",
  draft: "closed",
}

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                */
/* -------------------------------------------------------------------------- */

/** Ported from the old site's lib/format.js so wording stays identical. */
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return ""
  const diffMs = Date.now() - new Date(dateString).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "עכשיו"
  if (min < 60) return min === 1 ? "לפני דקה" : `לפני ${min} דק׳`
  const hr = Math.floor(min / 60)
  if (hr < 24) return hr === 1 ? "לפני שעה" : `לפני ${hr} שעות`
  const day = Math.floor(hr / 24)
  if (day === 1) return "אתמול"
  if (day < 30) return `לפני ${day} ימים`
  const month = Math.floor(day / 30)
  return month === 1 ? "לפני חודש" : `לפני ${month} חודשים`
}

/* -------------------------------------------------------------------------- */
/*  Row → UI                                                                  */
/* -------------------------------------------------------------------------- */

type RowWithOwner = ListingRow & {
  loading: DbLoading | null
  users?: { name: string | null; phone: string | null } | null
}

export type ListingWithContact = Listing & {
  contactPhone: string
  ownerUserId: string
  /** Raw database fields the matching engine scores on — never displayed. */
  dbTransport: Transport
  urgency: Urgency
  availableUntil: string | null
  deadline: string | null
}

/**
 * `viewer` supplies the current user's id (to decide "me" vs "other") and,
 * optionally, a coordinate to measure distance from. Without a coordinate
 * distanceKm stays null and the UI simply omits the distance.
 */
export function fromDbListing(
  row: RowWithOwner,
  viewer: { userId: string | null; lat?: number | null; lng?: number | null },
): ListingWithContact {
  const priceLabel = PRICE_TO_UI[row.price_type] ?? "ייקבע בהמשך"

  let distanceKm: number | null = null
  if (
    viewer.lat != null &&
    viewer.lng != null &&
    row.latitude != null &&
    row.longitude != null
  ) {
    distanceKm = Math.round(haversineKm(viewer.lat, viewer.lng, row.latitude, row.longitude))
  }

  return {
    id: row.id,
    type: row.type,
    material: row.material_type,
    quantity: Number(row.quantity_cubic),
    priceLabel,
    price: row.price_type === "perCubic" && row.price_value != null ? Number(row.price_value) : undefined,
    city: row.location_text || row.region || "לא צוין מיקום",
    distanceKm,
    timing: TIMING_TO_UI[row.urgency] ?? "תאריך ספציפי",
    transport: transportToUi(row.transport, row.type),
    loading: LOADING_TO_UI[(row.loading ?? "flexible") as DbLoading] ?? "תיאום בהמשך",
    owner: viewer.userId && row.user_id === viewer.userId ? "me" : "other",
    ownerName: row.users?.name?.trim() || "משתמש סנדיט",
    status: STATUS_TO_UI[row.status] ?? "relevant",
    createdAt: formatRelativeTime(row.created_at),
    details: row.notes ?? undefined,
    lat: row.latitude ?? undefined,
    lng: row.longitude ?? undefined,
    contactPhone: row.contact_phone || row.users?.phone || "",
    ownerUserId: row.user_id,
    images: row.images ?? [],
    dbTransport: row.transport,
    urgency: row.urgency,
    availableUntil: row.available_until,
    deadline: row.deadline,
  }
}

/* -------------------------------------------------------------------------- */
/*  Reading                                                                   */
/* -------------------------------------------------------------------------- */

const SELECT_WITH_OWNER = "*, users(name, phone)"

export async function fetchListings(viewer: {
  userId: string | null
  lat?: number | null
  lng?: number | null
}): Promise<{ listings: ListingWithContact[]; error: string | null }> {
  const { data, error } = await supabase
    .from("listings")
    .select(SELECT_WITH_OWNER)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("fetchListings failed", error)
    return { listings: [], error: "טעינת המודעות נכשלה. נסה שוב." }
  }

  const rows = (data ?? []) as unknown as RowWithOwner[]
  return { listings: rows.map((r) => fromDbListing(r, viewer)), error: null }
}

/* -------------------------------------------------------------------------- */
/*  Writing                                                                   */
/* -------------------------------------------------------------------------- */

export type NewListingInput = {
  type: ListingType
  /** Already resolved: the free-text value when "אחר" was chosen. */
  material: string
  quantityCubic: number
  priceLabel: string
  pricePerCube?: number | null
  cityName: string
  latitude: number | null
  longitude: number | null
  region: string | null
  timing: string
  /** ISO date, only when timing is "תאריך ספציפי". */
  specificDate?: string | null
  transport: string
  loading: string
  imageUrls?: string[]
  notes?: string | null
}

export type CreateResult =
  | { ok: true; listing: ListingWithContact; error: null }
  | { ok: false; listing: null; error: string }

export async function createListing(
  input: NewListingInput,
  author: { profileId: string; phone: string; name: string },
): Promise<CreateResult> {
  const priceType = PRICE_TO_DB[input.priceLabel] ?? "total"
  const urgency = TIMING_TO_DB[input.timing] ?? "future"
  const loadingValue = LOADING_TO_DB[input.loading] ?? "flexible"

  // The same calendar date means different things on the two sides: when a
  // supply listing is available until, versus when a demand listing is needed by.
  const isSupply = input.type === "supply"
  const specificDate = urgency === "future" ? (input.specificDate || null) : null

  const payload = {
    type: input.type,
    user_id: author.profileId,
    material_type: input.material,
    quantity_cubic: input.quantityCubic,

    location_text: input.cityName,
    latitude: input.latitude,
    longitude: input.longitude,
    region: input.region,

    urgency,
    available_until: isSupply ? specificDate : null,
    deadline: isSupply ? null : specificDate,

    price_type: priceType,
    price_value: priceType === "perCubic" ? (input.pricePerCube ?? null) : null,

    transport: transportToDb(input.transport, input.type),
    loading: loadingValue,
    // Kept in sync for the existing Edge Functions that still read the boolean.
    has_loading: loadingValue === "publisherHauls",

    contact_phone: author.phone,
    images: input.imageUrls ?? [],
    notes: input.notes ?? null,

    status: "open" as DbStatus,
  }

  const { data, error } = await supabase
    .from("listings")
    .insert(payload)
    .select(SELECT_WITH_OWNER)
    .single()

  if (error || !data) {
    console.error("createListing failed", error)
    if (error?.code === "42703") {
      return {
        ok: false,
        listing: null,
        error: "חסרה עמודה במסד הנתונים. יש להריץ את migration_008_loading.sql.",
      }
    }
    return { ok: false, listing: null, error: "פרסום המודעה נכשל. נסה שוב." }
  }

  const row = data as unknown as RowWithOwner
  // The insert doesn't return the joined owner name reliably, so fall back
  // to the author we already know.
  if (!row.users) row.users = { name: author.name, phone: author.phone }

  return { ok: true, listing: fromDbListing(row, { userId: author.profileId }), error: null }
}

export type EditListingInput = {
  material: string
  quantityCubic: number
  priceLabel: string
  pricePerCube?: number | null
  cityName: string
  timing: string
  specificDate?: string | null
  transport: string
  loading: string
  notes?: string | null
}

/**
 * Persists an edit. Changing the city re-resolves coordinates and region too,
 * otherwise the listing would keep the pin of the place it used to be in.
 */
export async function updateListing(
  listingId: string,
  type: ListingType,
  input: EditListingInput,
): Promise<CreateResult> {
  const priceType = PRICE_TO_DB[input.priceLabel] ?? "total"
  const urgency = TIMING_TO_DB[input.timing] ?? "future"
  const loadingValue = LOADING_TO_DB[input.loading] ?? "flexible"
  const isSupply = type === "supply"
  const specificDate = urgency === "future" ? (input.specificDate || null) : null

  const city = findCity(input.cityName)

  const patch: Partial<ListingRow> = {
    material_type: input.material,
    quantity_cubic: input.quantityCubic,
    location_text: input.cityName,
    urgency,
    available_until: isSupply ? specificDate : null,
    deadline: isSupply ? null : specificDate,
    price_type: priceType,
    price_value: priceType === "perCubic" ? (input.pricePerCube ?? null) : null,
    transport: transportToDb(input.transport, type),
    loading: loadingValue,
    has_loading: loadingValue === "publisherHauls",
    notes: input.notes ?? null,
  }

  if (city) {
    patch.latitude = city.lat
    patch.longitude = city.lng
    patch.region = city.region
  }

  const { data, error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", listingId)
    .select(SELECT_WITH_OWNER)
    .single()

  if (error || !data) {
    console.error("updateListing failed", error)
    return { ok: false, listing: null, error: "עדכון המודעה נכשל. נסה שוב." }
  }

  const row = data as unknown as RowWithOwner
  return { ok: true, listing: fromDbListing(row, { userId: row.user_id }), error: null }
}

export async function updateListingStatus(
  listingId: string,
  status: UiStatus,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("listings")
    .update({ status: STATUS_TO_DB[status] })
    .eq("id", listingId)

  if (error) {
    console.error("updateListingStatus failed", error)
    return { ok: false, error: "עדכון הסטטוס נכשל. נסה שוב." }
  }
  return { ok: true, error: null }
}

/* -------------------------------------------------------------------------- */
/*  Photos                                                                    */
/* -------------------------------------------------------------------------- */

/** Uploads to the public `listing-images` bucket created by schema.sql. */
export async function uploadListingImage(
  file: File,
  profileId: string,
): Promise<{ url: string | null; error: string | null }> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `${profileId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`

  const { error } = await supabase.storage
    .from("listing-images")
    .upload(path, file, { cacheControl: "3600", upsert: false })

  if (error) {
    console.error("uploadListingImage failed", error)
    return { url: null, error: "העלאת התמונה נכשלה. נסה שוב." }
  }

  const { data } = supabase.storage.from("listing-images").getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

export { PRICE_TO_UI, TIMING_TO_UI, LOADING_TO_UI, findCity, transportToDb, transportToUi }
