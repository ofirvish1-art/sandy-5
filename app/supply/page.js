"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";
import { MATERIALS } from "@/lib/materials";
import Wizard from "@/components/Wizard";
import SuccessModal from "@/components/SuccessModal";
import CityAutocomplete from "@/components/CityAutocomplete";

const TOTAL_STEPS = 4;

export default function SupplyPage() {
  const router = useRouter();
  const user = typeof window !== "undefined" ? getStoredUser() : null;

  const [step, setStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    material_type: MATERIALS[0],
    material_other: "",
    quantity_cubic: "",
    price_type: "", // item 7: no default — must be explicitly chosen
    price_value: "",
    location_text: "",
    region: null,
    latitude: null,
    longitude: null,
    urgency: "today",
    specific_date: "",
    transport: "buyerPickup",
    has_loading: "sellerLoads",
    image: null,
    notes: "",
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition((pos) =>
      setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
    );
  }

  function pickCity(city) {
    setForm((f) => ({ ...f, location_text: city.cityName, latitude: city.lat, longitude: city.lng, region: city.region }));
  }

  // Item 14: auto-advance 300ms after a single-select step is answered.
  function updateAndMaybeAdvance(field, value, isSingleSelectStep) {
    update(field, value);
    if (isSingleSelectStep && value !== "specific") {
      setTimeout(() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1)), 300);
    }
  }

  const priceNeedsValue = form.price_type === "perCubic";

  // Item 13: EITHER a typed/picked city OR "use my location" satisfies step 2.
  const hasLocation = !!form.location_text.trim() || (form.latitude != null && form.longitude != null);

  const stepValid = [
    !!form.quantity_cubic &&
      (form.material_type !== "אחר" || form.material_other.trim()) &&
      !!form.price_type && // item 7: mandatory
      (!priceNeedsValue || !!form.price_value), // item 12: required when perCubic
    hasLocation,
    form.urgency !== "specific" || !!form.specific_date,
    !!form.image, // mandatory photo/video per spec
  ][step];

  function next() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleSubmit();
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit() {
    setError("");
    if (!user) {
      setError("צריך להירשם קודם");
      return;
    }
    setLoading(true);

    let imageUrl = null;
    if (form.image) {
      const path = `${user.id}/${Date.now()}-${form.image.name}`;
      const { error: uploadError } = await supabase.storage.from("listing-images").upload(path, form.image);
      if (!uploadError) {
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    }

    const materialLabel = form.material_type === "אחר" ? form.material_other.trim() : form.material_type;

    const { error: dbError } = await supabase.from("listings").insert({
      type: "supply",
      user_id: user.id,
      material_type: materialLabel,
      quantity_cubic: Number(form.quantity_cubic),
      price_type: form.price_type,
      price_value: priceNeedsValue ? Number(form.price_value) : null,
      location_text: form.location_text.trim(),
      region: form.region,
      latitude: form.latitude,
      longitude: form.longitude,
      urgency: form.urgency === "specific" ? "future" : form.urgency,
      available_until: form.urgency === "specific" ? form.specific_date : null,
      transport: form.transport,
      has_loading: form.has_loading === "sellerLoads",
      images: imageUrl ? [imageUrl] : [],
      notes: form.notes.trim() || null,
      contact_phone: user.phone,
      status: "open",
    });

    setLoading(false);
    if (dbError) {
      setError("שגיאה בפרסום. נסה שוב.");
      console.error(dbError);
      return;
    }
    setShowSuccess(true);
  }

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <span className="chip chip-active mb-2 inline-block">היצע</span>
      <h1 className="font-display font-black text-2xl mb-5">פרסום מודעה</h1>

      <div className="card p-5">
        <Wizard
          step={step}
          totalSteps={TOTAL_STEPS}
          onBack={back}
          onNext={next}
          nextDisabled={!stepValid || loading}
          nextLabel={step === TOTAL_STEPS - 1 ? (loading ? "מפרסם…" : "פרסם") : "הבא"}
          title={["חומר ומחיר", "מיקום", "מועד", "הובלה ותמונה"][step]}
        >
          {step === 0 && (
            <>
              <div>
                <label className="field-label">סוג חומר</label>
                <select className="field-input" value={form.material_type} onChange={(e) => update("material_type", e.target.value)}>
                  {MATERIALS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              {form.material_type === "אחר" && (
                <div>
                  <label className="field-label">פרט את סוג החומר</label>
                  <input className="field-input" value={form.material_other} onChange={(e) => update("material_other", e.target.value)} />
                </div>
              )}
              <div>
                <label className="field-label">כמות בקו״ב</label>
                <input className="field-input" type="number" value={form.quantity_cubic} onChange={(e) => update("quantity_cubic", e.target.value)} placeholder="500" />
              </div>
              <div>
                <label className="field-label">מחיר *</label>
                <select className="field-input" value={form.price_type} onChange={(e) => update("price_type", e.target.value)}>
                  <option value="" disabled>— בחר סוג מחיר —</option>
                  <option value="perCubic">מחיר לקו״ב</option>
                  <option value="flexible">מחיר גמיש</option>
                  <option value="freePickup">חינם</option>
                  <option value="total">יקבע בהמשך</option>
                </select>
              </div>
              {/* Item 12: animated conditional row */}
              <div className={`grid transition-all duration-300 ${priceNeedsValue ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <label className="field-label">הזן מחיר ב-₪ לקו״ב</label>
                  <input className="field-input" type="number" value={form.price_value} onChange={(e) => update("price_value", e.target.value)} placeholder="35" />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="field-label">עיר</label>
                <CityAutocomplete value={form.location_text} onSelect={pickCity} placeholder="התחל להקליד שם עיר…" />
              </div>
              <div className="text-center text-xs text-forest/40">— או —</div>
              <button type="button" onClick={useMyLocation} className="text-sm text-olive font-semibold">
                📍 {form.latitude && !form.location_text ? "המיקום הנוכחי נקלט" : "השתמש במיקום הנוכחי שלי / נקודה במפה"}
              </button>
            </>
          )}

          {step === 2 && (
            <div>
              <label className="field-label">מועד</label>
              <select className="field-input" value={form.urgency} onChange={(e) => updateAndMaybeAdvance("urgency", e.target.value, true)}>
                <option value="now">היום</option>
                <option value="tomorrow">מחר</option>
                <option value="week">השבוע</option>
                <option value="specific">תאריך ספציפי</option>
              </select>
              {form.urgency === "specific" && (
                <input className="field-input mt-3" type="date" value={form.specific_date} onChange={(e) => update("specific_date", e.target.value)} />
              )}
            </div>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="field-label">הובלה</label>
                <select className="field-input" value={form.transport} onChange={(e) => update("transport", e.target.value)}>
                  <option value="buyerPickup">אתה תקח</option>
                  <option value="sellerHelps">אני אביא</option>
                  <option value="flexible">תיאום בהמשך</option>
                </select>
              </div>
              <div>
                <label className="field-label">העמסה</label>
                <select className="field-input" value={form.has_loading} onChange={(e) => update("has_loading", e.target.value)}>
                  <option value="sellerLoads">אני מעמיס</option>
                  <option value="buyerLoads">אתה מעמיס</option>
                  <option value="flexible">תיאום בהמשך</option>
                </select>
              </div>
              <div>
                <label className="field-label">תמונה / סרטון של החומר (חובה)</label>
                {/* Item 1: capture="environment" opens the live camera on mobile, while still allowing gallery pick */}
                <input
                  className="field-input"
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={(e) => update("image", e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="field-label">הערות</label>
                <textarea className="field-input" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="פה אפשר לכתוב כל הערה נוספת שחשובה לכם" />
              </div>
            </>
          )}
        </Wizard>

        {error && <p className="text-red-600 text-sm font-semibold mt-3">{error}</p>}
      </div>

      <SuccessModal
        open={showSuccess}
        message="העסקה פורסמה בהצלחה. ניתן לראותה במסך ההתאמות, לוח השנה או במפה"
        onClose={() => router.push("/matches")}
      />
    </main>
  );
}
