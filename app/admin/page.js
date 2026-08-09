"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { materialLabel } from "@/components/MaterialBadge";

// NOTE: this is a bare-bones admin screen for the pilot — it relies on
// Supabase RLS to keep it safe (see supabase/schema.sql, "admin_only"
// policies). Don't link to this page publicly; treat the URL as a
// shared secret until real admin auth is added.

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [
      { count: userCount },
      { count: supplyCount },
      { count: demandCount },
      { count: matchCount },
      { count: closedCount },
      { data: userRows },
      { data: listingRows },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("type", "supply"),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("type", "demand"),
      supabase.from("matches").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "closed"),
      supabase.from("users").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    setStats({
      users: userCount || 0,
      supply: supplyCount || 0,
      demand: demandCount || 0,
      matches: matchCount || 0,
      closed: closedCount || 0,
    });
    setUsers(userRows || []);
    setListings(listingRows || []);
  }

  async function updateListingStatus(id, status) {
    await supabase.from("listings").update({ status }).eq("id", id);
    loadAll();
  }

  async function deleteListing(id) {
    if (!confirm("למחוק את הפרסום לצמיתות?")) return;
    await supabase.from("listings").delete().eq("id", id);
    loadAll();
  }

  return (
    <main className="max-w-3xl mx-auto px-4 pt-8 pb-6">
      <h1 className="font-display font-black text-2xl">Admin Dashboard</h1>
      <div className="hazard-rule my-4" />

      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {[
            ["משתמשים", stats.users],
            ["היצעים", stats.supply],
            ["ביקושים", stats.demand],
            ["התאמות", stats.matches],
            ["נסגרו", stats.closed],
          ].map(([label, value]) => (
            <div key={label} className="card p-3 text-center">
              <div className="text-2xl font-black">{value}</div>
              <div className="text-[11px] text-stone-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {[
          ["overview", "פרסומים"],
          ["users", "משתמשים"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`text-sm px-3 py-1.5 rounded-lg border font-semibold ${
              tab === v ? "bg-stone-900 text-white border-stone-900" : "bg-white border-stone-200"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-2">
          {listings.map((l) => (
            <div key={l.id} className="card p-3 flex flex-wrap items-center gap-2 text-sm">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${l.type === "supply" ? "bg-supply-50 text-supply-600" : "bg-demand-50 text-demand-600"}`}>
                {l.type === "supply" ? "היצע" : "ביקוש"}
              </span>
              <span className="font-semibold">{materialLabel(l.material_type)}</span>
              <span className="text-stone-500">{l.quantity_cubic} קוב</span>
              <span className="text-stone-500">{l.location_text}</span>
              <span className="text-xs bg-stone-100 px-2 py-1 rounded-lg font-semibold">{l.status}</span>
              <div className="ms-auto flex gap-1">
                <select
                  className="text-xs border border-stone-200 rounded-lg px-1.5 py-1"
                  value={l.status}
                  onChange={(e) => updateListingStatus(l.id, e.target.value)}
                >
                  {["open", "inTalks", "closed", "notRelevant", "cancelled", "draft"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => deleteListing(l.id)}
                  className="text-xs text-demand-600 font-bold px-2"
                >
                  מחק
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="card p-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold">{u.name}</span>
              <span className="text-stone-500" dir="ltr">{u.phone}</span>
              <span className="text-stone-500">{u.email}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
