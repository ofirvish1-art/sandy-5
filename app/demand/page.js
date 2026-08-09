"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";

const MATERIALS = [
  ["sand", "חול"],
  ["hamra", "חמרה"],
  ["matza", "מצע"],
  ["other", "אחר"],
];
const URGENCIES = [
  ["now", "עכשיו"],
  ["today", "היום"],
  ["tomorrow", "מחר"],
  ["week", "השבוע"],
  ["future", "תאריך אחר"],
];
const RADII = [5, 10, 20, 50];
const TRANSPORTS = [
  ["buyerPickup", "אני בא לקחת"],
  ["needsTransport", "צריך הובלה"],
  ["flexible", "פתוח לתיאום"],
];

export default function DemandPage() {
  const router = useRouter();
  const user = typeof window !== "undefined" ? getStoredUser() : null;

  const [form, setForm] = useState({
    material_type: "sand",
    quantity_cubic: "",
    location_text: "",
    urgency: "now",
    max_radius_km: 20,
    price_type: "flexible",
    price_value: "",
    transport: "flexible",
    contact_phone: user?.phone || "",
    notes: "",
    quality_requirements: "",
    deadline: "",
    latitude: null,
    longitude: null,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e, asDraft = false) {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("צריך להירשם קודם");
      return;
    }
    if (!form.quantity_cubic || !form.location_text.trim()) {
      setError("כמות ומיקום הם שדות חובה");
      return;
    }

    setLoading(true);
    const { error: dbError } = await supabase.from("listings").insert({
      type: "demand",
      user_id: user.id,
      material_type: form.material_type,
      quantity_cubic: Number(form.quantity_cubic),
      location_text: form.location_text.trim(),
      urgency: form.urgency,
      max_radius_km: form.max_radius_km === "open" ? null : Number(form.max_radius_km),
      price_type: form.price_type,
      price_value: form.price_value ? Number(form.price_value) : null,
      transport: form.transport,
      contact_phone: form.contact_phone.trim(),
      notes: form.notes.trim() || null,
      quality_requirements: form.quality_requirements.trim() || null,
      deadline: form.deadline || null,
      latitude: form.latitude,
      longitude: form.longitude,
      status: asDraft ? "draft" : "open",
    });
    setLoading(false);

    if (dbError) {
      setError("שגיאה בפרסום. נסה שוב.");
      console.error(dbError);
      return;
    }

    router.push("/matches");
  }

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-lg bg-demand-50 text-demand-600">
        ביקוש
      </span>
      <h1 className="font-display font-black text-2xl mt-2">אני צריך</h1>
      <div className="hazard-rule my-4" style={{ "--stripe-color": "#D9480F" }} />
      <p className="text-stone-600 mb-5">
        פרסם איזה חומר אתה צריך, איפה ומתי — וקבל התאמות רלוונטיות.
      </p>

      {!user && (
        <p className="text-demand-600 text-sm font-semibold mb-4">
          יש להירשם קודם בעמוד ההרשמה כדי לפרסם.
        </p>
      )}

      <form className="space-y-4">
        <div>
          <label className="field-label">סוג חומר נדרש</label>
          <div className="grid grid-cols-4 gap-2">
            {MATERIALS.map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => update("material_type", value)}
                className={`rounded-xl py-2.5 text-sm font-bold border ${
                  form.material_type === value
                    ? "bg-demand-500 text-white border-demand-500"
                    : "bg-white border-stone-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">כמות בקוב</label>
          <input
            className="field-input"
            type="number"
            inputMode="numeric"
            value={form.quantity_cubic}
            onChange={(e) => update("quantity_cubic", e.target.value)}
            placeholder="500"
          />
        </div>

        <div>
          <label className="field-label">מיקום יעד</label>
          <input
            className="field-input"
            value={form.location_text}
            onChange={(e) => update("location_text", e.target.value)}
            placeholder="עיר / כתובת"
          />
          <button
            type="button"
            onClick={() =>
              navigator.geolocation?.getCurrentPosition((pos) =>
                setForm((f) => ({
                  ...f,
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                }))
              )
            }
            className="text-xs text-brand-600 font-semibold mt-1.5"
          >
            📍 {form.latitude ? "המיקום נקלט" : "השתמש במיקום שלי (למפה)"}
          </button>
        </div>

        <div>
          <label className="field-label">צריך מתי</label>
          <select
            className="field-input"
            value={form.urgency}
            onChange={(e) => update("urgency", e.target.value)}
          >
            {URGENCIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">רדיוס מקסימלי</label>
          <div className="grid grid-cols-5 gap-2">
            {RADII.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => update("max_radius_km", r)}
                className={`rounded-xl py-2 text-sm font-bold border ${
                  form.max_radius_km === r
                    ? "bg-demand-500 text-white border-demand-500"
                    : "bg-white border-stone-200"
                }`}
              >
                {r} ק״מ
              </button>
            ))}
            <button
              type="button"
              onClick={() => update("max_radius_km", "open")}
              className={`rounded-xl py-2 text-xs font-bold border ${
                form.max_radius_km === "open"
                  ? "bg-demand-500 text-white border-demand-500"
                  : "bg-white border-stone-200"
              }`}
            >
              פתוח
            </button>
          </div>
        </div>

        <div>
          <label className="field-label">מחיר יעד</label>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="field-input"
              value={form.price_type}
              onChange={(e) => update("price_type", e.target.value)}
            >
              <option value="perCubic">מחיר לקוב</option>
              <option value="total">מחיר כללי</option>
              <option value="flexible">גמיש</option>
              <option value="freePickup">לא יודע</option>
            </select>
            <input
              className="field-input"
              type="number"
              disabled={["flexible", "freePickup"].includes(form.price_type)}
              value={form.price_value}
              onChange={(e) => update("price_value", e.target.value)}
              placeholder="₪"
            />
          </div>
        </div>

        <div>
          <label className="field-label">הובלה</label>
          <select
            className="field-input"
            value={form.transport}
            onChange={(e) => update("transport", e.target.value)}
          >
            {TRANSPORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">טלפון ליצירת קשר</label>
          <input
            className="field-input"
            dir="ltr"
            value={form.contact_phone}
            onChange={(e) => update("contact_phone", e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">דרישות איכות (רשות)</label>
          <input
            className="field-input"
            value={form.quality_requirements}
            onChange={(e) => update("quality_requirements", e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">תאריך אחרון לקבלת החומר (רשות)</label>
          <input
            className="field-input"
            type="date"
            value={form.deadline}
            onChange={(e) => update("deadline", e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">הערות (רשות)</label>
          <textarea
            className="field-input"
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>

        {error && <p className="text-demand-600 text-sm font-semibold">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            שמור כטיוטה
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={loading}
            className="btn-demand flex-1"
          >
            {loading ? "מפרסם…" : "פרסם ביקוש"}
          </button>
        </div>
      </form>
    </main>
  );
}
