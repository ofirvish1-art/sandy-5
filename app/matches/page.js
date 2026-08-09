"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";
import { buildMatches } from "@/lib/matching";
import ListingCard from "@/components/ListingCard";
import { materialLabel } from "@/components/MaterialBadge";

const SCORE_LABEL = { high: "התאמה גבוהה", medium: "התאמה בינונית", low: "התאמה נמוכה" };
const SCORE_COLOR = {
  high: "bg-supply-500 text-white",
  medium: "bg-brand-500 text-white",
  low: "bg-stone-300 text-stone-800",
};

export default function MatchesPage() {
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (u) loadMatches(u);
    else setLoading(false);
  }, []);

  async function loadMatches(u) {
    setLoading(true);
    const { data: listings } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "open");

    const supply = (listings || []).filter((l) => l.type === "supply");
    const demand = (listings || []).filter((l) => l.type === "demand");

    const all = buildMatches(supply, demand);
    // Only show matches touching one of the current user's own listings —
    // that's "relevant to me" per the spec.
    const mine = all.filter(
      (m) => m.supply.user_id === u.id || m.demand.user_id === u.id
    );

    // Persist newly-seen matches so the notify webhook (on insert) can fire,
    // and so admin/analytics can see match volume over time. Cheap upsert
    // keyed on the pair, ignore conflicts.
    if (mine.length) {
      await supabase.from("matches").upsert(
        mine.map((m) => ({
          supply_listing_id: m.supply.id,
          demand_listing_id: m.demand.id,
          score: m.score,
          distance_km: m.distanceKm,
        })),
        { onConflict: "supply_listing_id,demand_listing_id", ignoreDuplicates: true }
      );
    }

    setMatches(mine);
    setLoading(false);
  }

  async function handleStatusChange(listing, status) {
    await supabase.from("listings").update({ status }).eq("id", listing.id);
    if (user) loadMatches(user);
  }

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
        <h1 className="font-display font-black text-2xl">התאמות רלוונטיות</h1>
        <div className="hazard-rule my-4" />
        <p className="text-stone-600">צריך להירשם קודם כדי לראות התאמות.</p>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <h1 className="font-display font-black text-2xl">התאמות רלוונטיות</h1>
      <div className="hazard-rule my-4" />

      {loading && <p className="text-stone-500">טוען…</p>}
      {!loading && matches.length === 0 && (
        <p className="text-stone-500">
          אין עדיין התאמות. פרסם היצע או ביקוש כדי להתחיל לראות התאמות כאן.
        </p>
      )}

      <div className="space-y-4">
        {matches.map((m) => {
          const mineIsSupply = m.supply.user_id === user.id;
          const other = mineIsSupply ? m.demand : m.supply;
          return (
            <div key={`${m.supply.id}-${m.demand.id}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${SCORE_COLOR[m.score]}`}>
                  {SCORE_LABEL[m.score]}
                </span>
                <span className="text-xs text-stone-500">
                  {materialLabel(other.material_type)} · ההתאמה שלך ל
                  {mineIsSupply ? "היצע" : "ביקוש"} שפרסמת
                </span>
              </div>
              <ListingCard
                listing={other}
                distanceKm={m.distanceKm}
                onStatusChange={handleStatusChange}
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
