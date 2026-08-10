export const URGENCY_LABELS = {
  now: "היום",
  today: "היום",
  tomorrow: "מחר",
  week: "השבוע",
  future: "תאריך ספציפי",
};

export const TRANSPORT_LABELS = {
  buyerPickup: "אתה תקח",
  sellerHelps: "אני אביא",
  needsTransport: "צריך הובלה",
  flexible: "תיאום בהמשך",
};

export const STATUS_LABELS = {
  open: "רלוונטי",
  pending: "בתהליך סגירה",
  closed: "נסגר",
  inTalks: "בתהליך סגירה",
  notRelevant: "נסגר",
  cancelled: "נסגר",
  draft: "טיוטה",
};

export function statusChipClass(status) {
  if (status === "open") return "chip-active";
  if (status === "pending" || status === "inTalks") return "chip-pending";
  return "chip-closed";
}

export function formatPrice(listing) {
  if (listing.price_type === "flexible") return "מחיר גמיש";
  if (listing.price_type === "freePickup") return "חינם";
  if (listing.price_type === "total" || listing.price_value == null) return "יקבע בהמשך";
  return `${listing.price_value} ₪ לקו״ב`;
}

export function waLink(phone, text) {
  const digits = (phone || "").replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
