"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ supply: 0, demand: 0 });

  useEffect(() => {
    setUser(getStoredUser());
    async function loadStats() {
      const [{ count: supply }, { count: demand }] = await Promise.all([
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("type", "supply").eq("status", "open"),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("type", "demand").eq("status", "open"),
      ]);
      setStats({ supply: supply || 0, demand: demand || 0 });
    }
    loadStats();
  }, []);

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <div className="mb-6">
        <p className="text-forest/60 text-sm">שלום{user ? ` ${user.name}` : ""} 👋</p>
        <h1 className="font-display font-black text-2xl text-olive">מה תרצה לעשות היום?</h1>
      </div>

      {/* Two large action cards */}
      <div className="grid grid-cols-1 gap-4">
        <Link
          href="/supply"
          className="rounded-2xl bg-sage p-5 flex items-center justify-between active:scale-[0.99] transition"
        >
          <div>
            <div className="font-display font-black text-xl text-olive">יש לי לתת</div>
            <div className="text-forest/70 text-sm mt-0.5">פרסם חומר זמין</div>
          </div>
          <span className="text-4xl">🚚</span>
        </Link>

        <Link
          href="/demand"
          className="rounded-2xl bg-olive p-5 flex items-center justify-between active:scale-[0.99] transition"
        >
          <div>
            <div className="font-display font-black text-xl text-cream">אני צריך</div>
            <div className="text-cream/70 text-sm mt-0.5">פרסם איזה חומר אתה צריך</div>
          </div>
          <span className="text-4xl">📦</span>
        </Link>
      </div>

      {/* Quick access shortcuts */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <Link href="/matches" className="card p-3 text-center">
          <div className="text-2xl mb-1">🔍</div>
          <div className="text-xs font-semibold">התאמות</div>
        </Link>
        <Link href="/calendar" className="card p-3 text-center">
          <div className="text-2xl mb-1">📅</div>
          <div className="text-xs font-semibold">לוח עסקאות</div>
        </Link>
        <Link href="/map" className="card p-3 text-center">
          <div className="text-2xl mb-1">🗺️</div>
          <div className="text-xs font-semibold">מפה</div>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-olive">{stats.supply}</div>
          <div className="text-xs text-forest/60 mt-1">היצעים פתוחים</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-olive">{stats.demand}</div>
          <div className="text-xs text-forest/60 mt-1">ביקושים פתוחים</div>
        </div>
      </div>
    </main>
  );
}
