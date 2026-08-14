"use client"

import { Camera, Check, ChevronLeft, ChevronRight, Crosshair, Loader2, MapPin, MessageCircle, Search } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useListings } from "@/components/listings-provider"
import { type City, nearestCity, searchCities } from "@/lib/cities"
import { type MatchBand, scoreMatch } from "@/lib/matching"
import { createListing, type ListingWithContact, uploadListingImage } from "@/lib/supabase/listings"
import { BottomSheet } from "./bottom-sheet"
import {
  LOADING_OPTIONS,
  type Listing,
  type ListingType,
  MATERIAL_OPTIONS,
  PRICE_OPTIONS,
  TIMING_OPTIONS,
  TRANSPORT_OPTIONS,
} from "./data"

type WizardMatch = { listing: ListingWithContact; percent: number; band: MatchBand }

const STEP_TITLES = ["חומר ומחיר", "מיקום", "עיתוי", "לוגיסטיקה"]

export function WizardModal({
  open,
  type,
  onClose,
  onNotify,
  onOpenListing,
}: {
  open: boolean
  type: ListingType
  onClose: () => void
  onNotify?: (msg: string) => void
  onOpenListing?: (l: Listing) => void
}) {
  const [step, setStep] = useState(0)
  const [material, setMaterial] = useState("")
  const [otherMaterial, setOtherMaterial] = useState("")
  const [quantity, setQuantity] = useState("")
  const [priceType, setPriceType] = useState("")
  const [pricePerCube, setPricePerCube] = useState("")
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [citySearch, setCitySearch] = useState("")
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [gps, setGps] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [timing, setTiming] = useState("")
  const [specificDate, setSpecificDate] = useState("")
  const [transport, setTransport] = useState("")
  const [loading, setLoading] = useState("")
  const [done, setDone] = useState(false)
  const [matches, setMatches] = useState<WizardMatch[]>([])
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { profile } = useAuth()
  const { listings, addListing } = useListings()

  const isSupply = type === "supply"

  function reset() {
    setStep(0)
    setMaterial("")
    setOtherMaterial("")
    setQuantity("")
    setPriceType("")
    setPricePerCube("")
    setPhoto(null)
    setPhotoFile(null)
    setCitySearch("")
    setSelectedCity(null)
    setGps(false)
    setGpsCoords(null)
    setGpsError(null)
    setTiming("")
    setSpecificDate("")
    setTransport("")
    setLoading("")
    setDone(false)
    setMatches([])
    setPublishing(false)
    setPublishError(null)
  }

  function handleClose() {
    onClose()
    setTimeout(reset, 300)
  }

  const cityMatches = useMemo(() => {
    if (!citySearch.trim() || selectedCity) return []
    return searchCities(citySearch).slice(0, 5)
  }, [citySearch, selectedCity])

  const step1Valid =
    (material && material !== "אחר" ? true : otherMaterial.trim().length > 0) &&
    quantity.trim().length > 0 &&
    priceType.length > 0 &&
    (priceType !== "מחיר לקוב" || pricePerCube.trim().length > 0) &&
    (!isSupply || !!photo)
  const step2Valid = !!selectedCity || gps
  const step3Valid = timing && (timing !== "תאריך ספציפי" || specificDate.length > 0)
  const step4Valid = transport.length > 0 && loading.length > 0

  const stepValid = [step1Valid, step2Valid, step3Valid, step4Valid][step]

  // Auto-advance helpers for single-choice steps
  function pickCity(c: City) {
    setSelectedCity(c)
    setCitySearch(c.cityName)
    setGps(false)
    setGpsCoords(null)
    setTimeout(() => setStep(2), 250)
  }

  // Reads a genuine device fix, then labels it with the nearest known city so
  // the listing still has a human-readable location and a region.
  function useGps() {
    setGpsError(null)
    if (!navigator.geolocation) {
      setGpsError("הדפדפן לא תומך באיתור מיקום. בחר עיר מהרשימה.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setGpsCoords({ lat: latitude, lng: longitude })
        setSelectedCity(nearestCity(latitude, longitude))
        setCitySearch("")
        setGps(true)
        setTimeout(() => setStep(2), 250)
      },
      () => {
        setGpsError("לא הצלחנו לאתר את המיקום. אשר גישה למיקום או בחר עיר מהרשימה.")
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  function pickTiming(t: string) {
    setTiming(t)
    if (t !== "תאריך ספציפי") setTimeout(() => setStep(3), 250)
  }

  async function next() {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    await publish()
  }

  async function publish() {
    if (publishing) return
    if (!profile) {
      setPublishError("לא נמצאו פרטי המשתמש. התחבר מחדש ונסה שוב.")
      return
    }

    setPublishing(true)
    setPublishError(null)

    const resolvedMaterial = material === "אחר" ? otherMaterial.trim() : material

    // Supply listings require a photo, so upload it before the row is written —
    // a listing that claims to have an image but doesn't is worse than a retry.
    let imageUrls: string[] = []
    if (photoFile) {
      const upload = await uploadListingImage(photoFile, profile.id)
      if (upload.error) {
        setPublishError(upload.error)
        setPublishing(false)
        return
      }
      if (upload.url) imageUrls = [upload.url]
    }

    const result = await createListing(
      {
        type,
        material: resolvedMaterial,
        quantityCubic: Number(quantity) || 0,
        priceLabel: priceType,
        pricePerCube: priceType === "מחיר לקוב" ? Number(pricePerCube) || null : null,
        cityName: selectedCity?.cityName ?? "",
        latitude: gpsCoords?.lat ?? selectedCity?.lat ?? null,
        longitude: gpsCoords?.lng ?? selectedCity?.lng ?? null,
        region: selectedCity?.region ?? null,
        timing,
        specificDate: specificDate || null,
        transport,
        loading,
        imageUrls,
      },
      { profileId: profile.id, phone: profile.phone, name: profile.name },
    )

    if (!result.ok) {
      setPublishError(result.error)
      setPublishing(false)
      return
    }

    addListing(result.listing)

    // Score the listing we just saved against everything already in the
    // database, using the same engine the rest of the app uses.
    const published = result.listing
    const counterparts = listings.filter(
      (l) => l.type !== published.type && l.status !== "closed" && l.ownerUserId !== profile.id,
    )
    const found = counterparts
      .map((other) => {
        const supply = published.type === "supply" ? published : other
        const demand = published.type === "supply" ? other : published
        const score = scoreMatch(supply, demand)
        return score ? { listing: other, percent: score.percent, band: score.score } : null
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.percent - a.percent)

    setMatches(found)
    setPublishing(false)
    setDone(true)
    onNotify?.(
      found.length > 0
        ? `המודעה פורסמה — נמצאו ${found.length} מודעות תואמות`
        : "המודעה פורסמה בהצלחה",
    )
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setPhotoFile(f)
      setPhoto(URL.createObjectURL(f))
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={isSupply ? "פרסום חומר זמין" : "פרסום בקשת חומר"}
      footer={
        !done ? (
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 rounded-2xl border border-border px-4 py-3 text-sm font-bold text-foreground"
              >
                <ChevronRight className="size-4" /> חזרה
              </button>
            )}
            <button
              type="button"
              disabled={!stepValid || publishing}
              onClick={next}
              className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {publishing && <Loader2 className="size-4 animate-spin" />}
              {publishing ? "מפרסם…" : step === 3 ? "פרסם מודעה" : "המשך"}
              {step < 3 && !publishing && <ChevronLeft className="size-4" />}
            </button>
          </div>
        ) : null
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-8" />
          </span>
          <h3 className="text-lg font-extrabold text-foreground">המודעה פורסמה!</h3>
          <p className="text-sm text-muted-foreground">המודעה שלך פעילה ותוצג למודעות התואמות באזור.</p>

          {matches.length > 0 && (
            <div className="mt-1 w-full rounded-2xl bg-sage-soft p-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <h4 className="text-sm font-extrabold text-primary">
                  נמצאו {matches.length} מודעות תואמות מיידיות!
                </h4>
                <span className="flex size-7 items-center justify-center rounded-full bg-success text-white">
                  <MessageCircle className="size-4" />
                </span>
              </div>
              <p className="mt-1 text-xs text-primary/80">
                בחר מודעה כדי לראות את הפרטים וליצור קשר ישירות.
              </p>
              <ul className="mt-3 space-y-2">
                {matches.slice(0, 3).map((m) => (
                  <li key={m.listing.id}>
                    <button
                      type="button"
                      onClick={() => {
                        handleClose()
                        onOpenListing?.(m.listing)
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-xl bg-card p-2.5 text-right transition-transform active:scale-[0.98]"
                    >
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          m.band === "high"
                            ? "bg-success/15 text-success"
                            : m.band === "medium"
                              ? "bg-warning/20 text-[oklch(0.45_0.1_85)]"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {m.percent}% התאמה
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {m.listing.material} · {m.listing.quantity} קוב
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.listing.ownerName} · {m.listing.city}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="mt-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            סגור
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {publishError && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3 py-2.5 text-right text-xs font-bold leading-relaxed text-destructive"
            >
              {publishError}
            </p>
          )}

          {/* Progress */}
          <div className="flex items-center gap-1.5">
            {STEP_TITLES.map((t, i) => (
              <div key={t} className="flex flex-1 flex-col items-center gap-1">
                <div className={`h-1.5 w-full rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
                <span className={`text-[10px] font-semibold ${i === step ? "text-primary" : "text-muted-foreground"}`}>
                  {t}
                </span>
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4 text-right">
              <Field label="סוג חומר">
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
                >
                  <option value="" disabled>
                    בחר סוג חומר
                  </option>
                  {MATERIAL_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              {material === "אחר" && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <input
                    value={otherMaterial}
                    onChange={(e) => setOtherMaterial(e.target.value)}
                    placeholder="פרט את סוג החומר"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
                  />
                </div>
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
                  <option value="" disabled>
                    בחר תמחור
                  </option>
                  {PRICE_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              {priceType === "מחיר לקוב" && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <div className="relative">
                    <input
                      inputMode="numeric"
                      value={pricePerCube}
                      onChange={(e) => setPricePerCube(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="הזן מחיר ב-₪ לקוב"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 pe-9 text-right text-sm outline-none focus:border-primary"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                      ₪
                    </span>
                  </div>
                </div>
              )}
              {/* Photo is required for supply listings and omitted entirely for demand listings */}
              {isSupply && (
                <Field label="תמונת החומר (חובה)">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onPhoto}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-6 text-sm font-bold ${
                      !photo
                        ? "border-destructive bg-destructive/5 text-destructive"
                        : "border-border bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo || "/placeholder.svg"} alt="תצוגה מקדימה" className="h-20 rounded-lg object-cover" />
                    ) : (
                      <>
                        <Camera className="size-5" /> צלם או העלה תמונה
                      </>
                    )}
                  </button>
                  {!photo && (
                    <p className="mt-1.5 text-xs font-semibold text-destructive">
                      חובה לצרף תמונה אחת לפחות לפרסום היצע חומר.
                    </p>
                  )}
                </Field>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 text-right">
              <Field label="חיפוש עיר">
                <div className="relative">
                  <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={citySearch}
                    onChange={(e) => {
                      setCitySearch(e.target.value)
                      setSelectedCity(null)
                    }}
                    placeholder="הקלד שם עיר"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 pe-9 text-right text-sm outline-none focus:border-primary"
                  />
                </div>
                {cityMatches.length > 0 && (
                  <ul className="mt-1 overflow-hidden rounded-xl border border-border">
                    {cityMatches.map((c) => (
                      <li key={c.cityName}>
                        <button
                          type="button"
                          onClick={() => pickCity(c)}
                          className="flex w-full items-center justify-end gap-2 bg-card px-3 py-2.5 text-right text-sm hover:bg-accent"
                        >
                          {c.cityName} <MapPin className="size-4 text-sage" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">או</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={useGps}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-colors ${
                  gps ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                <Crosshair className="size-4" /> השתמש במיקום הנוכחי
              </button>
              {gps && selectedCity && (
                <p className="text-center text-xs text-success">
                  המיקום נקלט — האזור הקרוב: {selectedCity.cityName}
                </p>
              )}
              {gpsError && (
                <p className="text-center text-xs font-semibold text-destructive">{gpsError}</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 text-right">
              <div className="grid grid-cols-2 gap-2">
                {TIMING_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => pickTiming(t)}
                    className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
                      timing === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {timing === "תאריך ספציפי" && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-right">
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
              <Field label="העמסה">
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
            </div>
          )}
        </div>
      )}
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
