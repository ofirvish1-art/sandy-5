"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { materialLabel } from "@/components/MaterialBadge";
import { URGENCY_LABELS, formatPrice } from "@/lib/format";

const BUCKETS = ["now", "today", "tomorrow", "week", "future"];
const MATERIALS = ["all", "sand", "hamra", "matza", "other"];

export default function TimelinePage() {
  const [listings, setListings] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all"); // all | supply | demand
  const [materialFilter, setMaterialFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      setListings(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return listings.filter(
      (l) =>
        (typeFilter === "all" || l.type === typeFilter) &&
        (materialFilter === "all" || l.material_type === materialFilter)
    );
  }, [listings, typeFilter, materialFilter]);

  const byBucket = useMemo(() => {
    const map = Object.fromEntries(BUCKETS.map((b) => [b, []]));
    for (const l of filtered) {
      (map[l.urgency] || map.future).push(l);
    }
    return map;
  }, [filtered]);

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <h1 className="font-display font-black text-2xl">תכנון קדימה</h1>
      <div className="hazard-rule my-4" />

      <div className="flex gap-2 flex-wrap mb-3">
        {[
          ["all", "הכל"],
          ["supply", "היצע"],
          ["demand", "ביקוש"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTypeFilter(v)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${
              typeFilter === v ? "bg-stone-900 text-white border-stone-900" : "bg-white border-stone-200"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {MATERIALS.map((m) => (
          <button
            key={m}
            onClick={() => setMaterialFilter(m)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${
              materialFilter === m ? "bg-brand-500 text-white border-brand-500" : "bg-white border-stone-200"
            }`}
          >
            {m === "all" ? "כל החומרים" : materialLabel(m)}
          </button>
        ))}
      </div>

      {/* Summary table (spec 7 → date/supply-count/demand-count) */}
      <div className="card overflow-hidden mb-6">
        <table className="w-full text-sm text-center">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="py-2 px-2 font-bold">תאריך</th>
              <th className="py-2 px-2 font-bold text-supply-600">היצעים</th>
              <th className="py-2 px-2 font-bold text-demand-600">ביקושים</th>
            </tr>
          </thead>
          <tbody>
            {BUCKETS.map((b) => (
              <tr key={b} className="border-t border-stone-100">
                <td className="py-2 px-2 font-semibold">{URGENCY_LABELS[b]}</td>
                <td className="py-2 px-2">{byBucket[b].filter((l) => l.type === "supply").length}</td>
                <td className="py-2 px-2">{byBucket[b].filter((l) => l.type === "demand").length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className="text-stone-500">טוען…</p>}

      {/* Simple gantt-style rows, grouped by time bucket */}
      <div className="space-y-6">
        {BUCKETS.filter((b) => byBucket[b].length > 0).map((b) => (
          <div key={b}>
            <h2 className="font-display font-bold text-stone-800 mb-2">{URGENCY_LABELS[b]}</h2>
            <div className="space-y-2">
              {byBucket[b].map((l) => (
                <div
                  key={l.id}
                  className={`flex items-center gap-3 rounded-xl border-s-4 bg-white border border-stone-200 px-3 py-2.5 ${
                    l.type === "supply" ? "border-s-supply-500" : "border-s-demand-500"
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      l.type === "supply" ? "bg-supply-50 text-supply-600" : "bg-demand-50 text-demand-600"
                    }`}
                  >
                    {l.type === "supply" ? "היצע" : "ביקוש"}
                  </span>
                  <span className="text-sm font-bold">{materialLabel(l.material_type)}</span>
                  <span className="text-sm text-stone-500">{l.quantity_cubic} קוב</span>
                  <span className="text-sm text-stone-500">{l.location_text}</span>
                  <span className="text-sm text-stone-500 me-auto">{formatPrice(l)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
