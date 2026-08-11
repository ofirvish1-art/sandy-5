"use client";

import { MATERIALS } from "@/lib/materials";
import { useFilters } from "@/contexts/FilterContext";

// Shared between /matches (Explore) and /map — same filter shape, same
// options everywhere (item 3 + item 16 in the upgrade spec).
export default function FilterBar({ onLocateMe, locating }) {
  const { filters, updateFilter } = useFilters();

  return (
    <div className="card p-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["all", "הכל"],
          ["supply", "מציעים"],
          ["demand", "מבקשים"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => updateFilter("type", v)}
            className={`text-xs px-3 py-2 rounded-lg border font-semibold ${
              filters.type === v ? "bg-olive text-cream border-olive" : "bg-white border-sage-dark/60"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <select className="field-input" value={filters.material} onChange={(e) => updateFilter("material", e.target.value)}>
        <option value="all">כל סוגי החומר</option>
        {MATERIALS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <select className="field-input" value={filters.priceType} onChange={(e) => updateFilter("priceType", e.target.value)}>
          <option value="all">כל סוגי המחיר</option>
          <option value="perCubic">מחיר לקו״ב</option>
          <option value="flexible">מחיר גמיש</option>
          <option value="freePickup">חינם</option>
          <option value="total">יקבע בהמשך</option>
        </select>

        {/* Item 16: exactly these 4 transport options everywhere */}
        <select className="field-input" value={filters.transport} onChange={(e) => updateFilter("transport", e.target.value)}>
          <option value="all">כל האפשרויות</option>
          <option value="buyerPickup">אני אקח</option>
          <option value="sellerHelps">אתה תיקח</option>
          <option value="flexible">תיאום בהמשך</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select className="field-input" value={filters.loading} onChange={(e) => updateFilter("loading", e.target.value)}>
          <option value="all">העמסה — הכל</option>
          <option value="yes">כולל העמסה</option>
          <option value="no">בלי העמסה</option>
        </select>
        <select className="field-input" value={filters.radiusKm} onChange={(e) => updateFilter("radiusKm", e.target.value)}>
          <option value="all">רדיוס — הכל</option>
          <option value="10">10 ק״מ</option>
          <option value="20">20 ק״מ</option>
          <option value="40">40 ק״מ</option>
        </select>
      </div>

      {onLocateMe && (
        <button type="button" onClick={onLocateMe} className="text-xs text-olive font-semibold">
          📍 {locating ? "המיקום נקלט — ממויין לפי מרחק" : "השתמש במיקום שלי לסינון לפי רדיוס"}
        </button>
      )}
    </div>
  );
}
