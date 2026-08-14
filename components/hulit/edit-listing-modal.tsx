"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { type ListingWithContact, updateListing } from "@/lib/supabase/listings"
import { BottomSheet } from "./bottom-sheet"
import {
  type Listing,
  LOADING_OPTIONS,
  MATERIAL_OPTIONS,
  PRICE_OPTIONS,
  TIMING_OPTIONS,
  TRANSPORT_OPTIONS,
} from "./data"

const PRICE_PER_CUBE = "מחיר לקוב"
const SPECIFIC_DATE = "תאריך ספציפי"

export function EditListingModal({
  listing,
  onClose,
  onSave,
  onNotify,
}: {
  listing: Listing | null
  onClose: () => void
  onSave: (updated: ListingWithContact) => void
  onNotify?: (msg: string) => void
}) {
  const knownMaterial = listing ? MATERIAL_OPTIONS.includes(listing.material as (typeof MATERIAL_OPTIONS)[number]) : true

  const [material, setMaterial] = useState("")
  const [otherMaterial, setOtherMaterial] = useState("")
  const [quantity, setQuantity] = useState("")
  const [priceType, setPriceType] = useState("")
  const [pricePerCube, setPricePerCube] = useState("")
  const [timing, setTiming] = useState("")
  const [specificDate, setSpecificDate] = useState("")
  const [transport, setTransport] = useState("")
  const [loading, setLoading] = useState("")
  const [city, setCity] = useState("")
  const [details, setDetails] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-hydrate the form every time a new listing is opened for editing.
  useEffect(() => {
    if (!listing) return
    const known = MATERIAL_OPTIONS.includes(listing.material as (typeof MATERIAL_OPTIONS)[number])
    setMaterial(known ? listing.material : "אחר")
    setOtherMaterial(known ? "" : listing.material)
    setQuantity(String(listing.quantity))
    setPriceType(listing.priceLabel)
    setPricePerCube(listing.price ? String(listing.price) : "")
    setTiming(TIMING_OPTIONS.includes(listing.timing as (typeof TIMING_OPTIONS)[number]) ? listing.timing : SPECIFIC_DATE)
    setSpecificDate("")
    setTransport(listing.transport)
    setLoading(listing.loading)
    setCity(listing.city)
    setDetails(listing.details ?? "")
  }, [listing])

  const finalMaterial = material === "אחר" ? otherMaterial.trim() : material
  const valid =
    finalMaterial.length > 0 &&
    quantity.trim().length > 0 &&
    priceType.length > 0 &&
    (priceType !== PRICE_PER_CUBE || pricePerCube.trim().length > 0) &&
    (timing !== SPECIFIC_DATE || specificDate.length > 0) &&
    transport.length > 0 &&
    loading.length > 0 &&
    city.trim().length > 0

  async function handleSave() {
    if (!listing || !valid || saving) return
    setSaving(true)
    setError(null)

    const result = await updateListing(listing.id, listing.type, {
      material: finalMaterial,
      quantityCubic: Number(quantity) || 0,
      priceLabel: priceType,
      pricePerCube: priceType === PRICE_PER_CUBE ? Number(pricePerCube) || null : null,
      cityName: city.trim(),
      timing,
      specificDate: specificDate || null,
      transport,
      loading,
      notes: details.trim() || null,
    })

    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    onSave(result.listing)
    onNotify?.("המודעה עודכנה בהצלחה")
    onClose()
  }

  return (
    <BottomSheet
      open={!!listing}
      onClose={onClose}
      title="עריכת מודעה"
      footer={
        <div className="space-y-2">
          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-center text-xs font-bold text-destructive">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={!valid || saving}
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "שומר…" : "שמור שינויים"}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-right">
        <Field label="סוג חומר">
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
          >
            {MATERIAL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        {material === "אחר" && (
          <input
            value={otherMaterial}
            onChange={(e) => setOtherMaterial(e.target.value)}
            placeholder="פרט את סוג החומר"
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
          />
        )}

        <Field label="כמות בקוב">
          <input
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="לדוגמה: 120"
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="מחיר">
          <select
            value={priceType}
            onChange={(e) => setPriceType(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
          >
            {PRICE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        {priceType === PRICE_PER_CUBE && (
          <div className="relative">
            <input
              inputMode="numeric"
              value={pricePerCube}
              onChange={(e) => setPricePerCube(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="הזן מחיר ב-₪ לקוב"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 pe-9 text-right text-sm outline-none focus:border-primary"
            />
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₪</span>
          </div>
        )}

        <Field label="עיתוי">
          <div className="grid grid-cols-2 gap-2">
            {TIMING_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTiming(t)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                  timing === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        {timing === SPECIFIC_DATE && (
          <input
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
          />
        )}

        <Field label="הובלה">
          <div className="grid grid-cols-3 gap-2">
            {TRANSPORT_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTransport(t)}
                className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors ${
                  transport === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="לוגיסטיקה (העמסה)">
          <div className="grid grid-cols-3 gap-2">
            {LOADING_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLoading(t)}
                className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors ${
                  loading === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="מיקום">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="עיר / אזור"
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="פרטים נוספים">
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="מידע נוסף שיעזור לצד השני (אופציונלי)"
            className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
          />
        </Field>
      </div>
    </BottomSheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-foreground">{label}</label>
      {children}
    </div>
  )
}
