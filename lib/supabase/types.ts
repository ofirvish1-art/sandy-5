// Row types for the live SANDIT Supabase project (ref: hrjxojobkssyszeycnbd).
//
// These mirror the schema that is ACTUALLY deployed today — the result of
// supabase/schema.sql plus migrations 002, 003, 005 and 006. Verified against
// the running project, not just the .sql files.
//
// Anything the new v0 design needs but the database does not have yet is
// called out in supabase/GAPS.md rather than silently invented here.

export type ListingType = "supply" | "demand"

export type ListingStatus = "open" | "inTalks" | "closed" | "notRelevant" | "cancelled" | "draft"

export type Urgency = "now" | "today" | "tomorrow" | "week" | "future"

export type PriceType = "perCubic" | "total" | "flexible" | "freePickup"

export type Transport = "buyerPickup" | "sellerHelps" | "needsTransport" | "flexible"

export type UserRow = {
  id: string
  /** Added by migration 007. Null on the rows that predate authentication. */
  auth_user_id: string | null
  name: string
  phone: string
  email: string | null
  created_at: string
  consent_terms: boolean
  consent_privacy: boolean
  consent_contact_disclosure: boolean
  consent_whatsapp_operational: boolean
  consented_at: string | null
}

export type ListingRow = {
  id: string
  type: ListingType
  user_id: string

  material_type: string // free text since migration 002 dropped the enum check
  quantity_cubic: number

  location_text: string
  latitude: number | null
  longitude: number | null
  region: string | null

  urgency: Urgency
  available_until: string | null // supply only
  deadline: string | null // demand only
  max_radius_km: number | null // demand only

  price_type: PriceType
  price_value: number | null

  transport: Transport
  contact_phone: string

  images: string[]
  video_url: string | null
  notes: string | null
  quality_requirements: string | null // demand only
  has_loading: boolean
  /** Added by migration 008. Who does the loading. */
  loading: "publisherHauls" | "counterpartyLoads" | "flexible" | null

  status: ListingStatus

  created_at: string
  updated_at: string
}

export type MatchRow = {
  id: string
  supply_listing_id: string
  demand_listing_id: string
  score: "high" | "medium" | "low"
  distance_km: number | null
  status: "new" | "contacted" | "relevant" | "closed" | "notRelevant"
  created_at: string
}

export type InterestEventRow = {
  id: string
  listing_id: string
  viewer_user_id: string | null
  /** 'interest' allowed from migration 010 — the quiet "I'm interested" flag. */
  channel: "call" | "whatsapp" | "interest"
  notified: boolean
  follow_up_sent_at: string | null
  follow_up_status: "relevant" | "pending" | "closed" | null
  created_at: string
}

export type CalendarEventRow = {
  id: string
  user_id: string
  title: string
  event_date: string
  category: string | null
  color: string | null
  reminder_at: string | null
  reminder_sent_at: string | null
  reminder_offset: "sameDay" | "dayBefore" | "twoDaysBefore" | "custom" | null
  created_at: string
}

/** Added by migration 010 — one row per attempt to notify a listing owner. */
export type NotificationAttemptRow = {
  id: string
  interest_event_id: string | null
  listing_id: string | null
  recipient_user_id: string | null
  recipient_phone: string | null
  source_channel: "call" | "whatsapp" | "interest"
  provider: string | null
  status: "skipped" | "pending" | "sent" | "failed"
  error: string | null
  /** Composed by the Edge Function, not the trigger — see migration 012. */
  message: string | null
  payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type FeedbackRow = {
  id: string
  user_id: string | null
  message: string
  /** 1–5, added by migration 011. Null when only free text was given. */
  rating: number | null
  created_at: string
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      users: Table<UserRow>
      listings: Table<ListingRow>
      matches: Table<MatchRow>
      interest_events: Table<InterestEventRow>
      calendar_events: Table<CalendarEventRow>
      notification_attempts: Table<NotificationAttemptRow>
      feedback: Table<FeedbackRow>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
