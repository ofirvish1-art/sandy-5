export const URGENCY_LABELS = {
  now: "היום",
  today: "היום",
  tomorrow: "מחר",
  week: "השבוע",
  future: "תאריך ספציפי",
};

export const TRANSPORT_LABELS = {
  buyerPickup: "אתה תיקח",
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

export function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "עכשיו";
  if (min < 60) return min === 1 ? "לפני דקה" : `לפני ${min} דק׳`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "לפני שעה" : `לפני ${hr} שעות`;
  const day = Math.floor(hr / 24);
  if (day < 30) return day === 1 ? "לפני יום" : `לפני ${day} ימים`;
  const month = Math.floor(day / 30);
  return month === 1 ? "לפני חודש" : `לפני ${month} חודשים`;
}
