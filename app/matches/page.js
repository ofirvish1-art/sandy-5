"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { haversineKm } from "@/lib/matching";
import { useFilters } from "@/contexts/FilterContext";
import FilterBar from "@/components/FilterBar";
import ListingCard from "@/components/ListingCard";
import SuccessModal from "@/components/SuccessModal";

export default function ExplorePage() {
  const { filters, updateFilter } = useFilters();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState(null);
  const [interestSent, setInterestSent] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("listings").select("*").eq("status", "open").order("created_at", { ascending: false });
      setListings(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function locateMe() {
    navigator.geolocation?.getCurrentPosition((p) => setMyLocation({ lat: p.coords.latitude, lng: p.coords.longitude }));
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

      <div className="mb-5">
        <FilterBar onLocateMe={locateMe} locating={!!myLocation} />
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
