export const URGENCY_LABELS = {
  now: "עכשיו",
  today: "היום",
  tomorrow: "מחר",
  week: "השבוע",
  future: "תאריך אחר",
};

export const TRANSPORT_LABELS = {
  buyerPickup: "הקונה בא לקחת",
  sellerHelps: "אני יכול לעזור בהובלה",
  needsTransport: "צריך הובלה",
  flexible: "פתוח לתיאום",
};

export function formatPrice(listing) {
  if (listing.price_type === "flexible") return "גמיש";
  if (listing.price_type === "freePickup") return "תבוא תיקח";
  if (listing.price_value == null) return "לא צוין";
  if (listing.price_type === "perCubic") return `${listing.price_value} ₪ לקוב`;
  return `${listing.price_value} ₪ סה״כ`;
}

export function waLink(phone, text) {
  const digits = (phone || "").replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
