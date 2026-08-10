"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { haversineKm } from "@/lib/matching";
import { MATERIALS } from "@/lib/materials";
import ListingCard from "@/components/ListingCard";
import SuccessModal from "@/components/SuccessModal";

export default function ExplorePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState(null);
  const [interestSent, setInterestSent] = useState(false);

  const [filters, setFilters] = useState({
    type: "all", // all | supply | demand
    material: "all",
    priceType: "all",
    transport: "all",
    loading: "all",
    radiusKm: "all",
  });

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("listings").select("*").eq("status", "open").order("created_at", { ascending: false });
      setListings(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function updateFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  const filtered = useMemo(() => {
    let list = listings;
    if (filters.type !== "all") list = list.filter((l) => l.type === filters.type);
    if (filters.material !== "all") list = list.filter((l) => l.material_type === filters.material);
    if (filters.priceType !== "all") list = list.filter((l) => l.price_type === filters.priceType);
    if (filters.transport !== "all") list = list.filter((l) => l.transport === filters.transport);
    if (filters.loading !== "all") {
      const wantsLoading = filters.loading === "yes";
      list = list.filter((l) => !!l.has_loading === wantsLoading);
    }

    let withDistance = list.map((l) => ({
      ...l,
      _dist: myLocation ? haversineKm(myLocation.lat, myLocation.lng, l.latitude, l.longitude) : null,
    }));

    if (filters.radiusKm !== "all" && myLocation) {
      const r = Number(filters.radiusKm);
      withDistance = withDistance.filter((l) => l._dist == null || l._dist <= r);
    }
    if (myLocation) withDistance.sort((a, b) => (a._dist ?? 9999) - (b._dist ?? 9999));

    return withDistance;
  }, [listings, filters, myLocation]);

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <h1 className="font-display font-black text-2xl mb-4">התאמות</h1>

      {/* Global filter bar */}
      <div className="card p-4 space-y-3 mb-5">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["all", "הכל"],
            ["supply", "היצע"],
            ["demand", "ביקוש"],
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
          <select className="field-input" value={filters.transport} onChange={(e) => updateFilter("transport", e.target.value)}>
            <option value="all">כל אפשרויות ההובלה</option>
            <option value="buyerPickup">אתה תקח / אני אקח</option>
            <option value="sellerHelps">אני אביא / אתה תביא</option>
            <option value="flexible">תיאום בהמשך</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select className="field-input" value={filters.loading} onChange={(e) => updateFilter("loading", e.target.value)}>
            <option value="all">העמסה — הכל</option>
            <option value="yes">כולל העמסה</option>
            <option value="no">בלי העמסה</option>
          </select>
          <select
            className="field-input"
            value={filters.radiusKm}
            onChange={(e) => updateFilter("radiusKm", e.target.value)}
            disabled={!myLocation}
          >
            <option value="all">רדיוס — הכל</option>
            <option value="10">10 ק״מ</option>
            <option value="20">20 ק״מ</option>
            <option value="50">50 ק״מ</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => navigator.geolocation?.getCurrentPosition((p) => setMyLocation({ lat: p.coords.latitude, lng: p.coords.longitude }))}
          className="text-xs text-olive font-semibold"
        >
          📍 {myLocation ? "המיקום נקלט — התוצאות ממוינות לפי מרחק" : "השתמש במיקום שלי לסינון לפי רדיוס"}
        </button>
      </div>

      {loading && <p className="text-forest/50">טוען…</p>}
      {!loading && filtered.length === 0 && <p className="text-forest/50">אין מודעות שמתאימות לסינון הנוכחי.</p>}

      <div className="space-y-4">
        {filtered.map((l) => (
          <ListingCard key={l.id} listing={l} distanceKm={l._dist != null ? Math.round(l._dist) : null} onExpressInterest={() => setInterestSent(true)} />
        ))}
      </div>

      <SuccessModal open={interestSent} message="ההתעניינות שלך נשלחה! בעל המודעה יקבל עדכון." onClose={() => setInterestSent(false)} />
    </main>
  );
}
