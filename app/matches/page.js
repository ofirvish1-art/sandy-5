"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { haversineKm, buildMatches } from "@/lib/matching";
import { useFilters } from "@/contexts/FilterContext";
import { useRefetchOnFocus } from "@/lib/useRefetchOnFocus";
import { getStoredUser } from "@/lib/session";
import FilterBar from "@/components/FilterBar";
import ListingCard from "@/components/ListingCard";
import SuccessModal from "@/components/SuccessModal";
import { materialLabel } from "@/components/MaterialBadge";

export default function ExplorePage() {
  const { filters } = useFilters();
  const user = typeof window !== "undefined" ? getStoredUser() : null;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState(null);
  const [interestSent, setInterestSent] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("listings").select("*").eq("status", "open").order("created_at", { ascending: false });
    setListings(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Item 11: re-fetch whenever the tab regains focus/visibility.
  useRefetchOnFocus(load);

  function locateMe() {
    navigator.geolocation?.getCurrentPosition((p) => setMyLocation({ lat: p.coords.latitude, lng: p.coords.longitude }));
  }

  // Item 13: "מודעות מתאימות לך" — matches between the user's own listings
  // and the opposite type, using the fuzzy matching engine.
  const matchedForYou = useMemo(() => {
    if (!user) return [];
    const mine = listings.filter((l) => l.user_id === user.id);
    if (mine.length === 0) return [];
    const mySupply = mine.filter((l) => l.type === "supply");
    const myDemand = mine.filter((l) => l.type === "demand");
    const others = listings.filter((l) => l.user_id !== user.id);
    const otherSupply = others.filter((l) => l.type === "supply");
    const otherDemand = others.filter((l) => l.type === "demand");

    const matches = [...buildMatches(mySupply, otherDemand), ...buildMatches(otherSupply, myDemand)];
    return matches.slice(0, 8).map((m) => {
      const mineIsSupply = mySupply.includes(m.supply);
      return { listing: mineIsSupply ? m.demand : m.supply, percent: m.percent };
    });
  }, [listings, user]);

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
      <h1 className="font-display font-black text-2xl mb-4">מודעות</h1>

      {matchedForYou.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display font-bold text-lg mb-2">✨ מודעות מתאימות לך</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {matchedForYou.map(({ listing, percent }) => (
              <Link
                key={listing.id}
                href="#"
                className="shrink-0 w-52 card p-3 bg-sage/10 border-sage"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="chip bg-olive text-cream">{percent}% התאמה</span>
                  <span className="chip bg-white text-olive">{listing.type === "supply" ? "היצע" : "ביקוש"}</span>
                </div>
                <div className="font-bold text-sm">{materialLabel(listing.material_type)}</div>
                <div className="text-xs text-forest/50 mt-1">
                  {listing.quantity_cubic} קו״ב · {listing.location_text}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Item 13: collapsible filter drawer */}
      <button
        onClick={() => setFiltersOpen((o) => !o)}
        className="btn-secondary w-full mb-3 justify-between"
      >
        <span>🎚️ סינון</span>
        <span>{filtersOpen ? "▲" : "▼"}</span>
      </button>
      {filtersOpen && (
        <div className="mb-5">
          <FilterBar onLocateMe={locateMe} locating={!!myLocation} />
        </div>
      )}

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
