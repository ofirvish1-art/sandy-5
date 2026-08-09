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
        supabase
          .from("listings")
          .select("*", { count: "exact", head: true })
          .eq("type", "supply")
          .eq("status", "open"),
        supabase
          .from("listings")
          .select("*", { count: "exact", head: true })
          .eq("type", "demand")
          .eq("status", "open"),
      ]);
      setStats({ supply: supply || 0, demand: demand || 0 });
    }
    loadStats();
  }, []);

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center text-white font-black">
          ע
        </span>
        <span className="font-display font-black text-lg">מרקטפלייס קבלני עפר</span>
      </div>
      <div className="hazard-rule my-4" />

      <h1 className="font-display font-black text-2xl leading-snug text-stone-900">
        יש לך חומר לתת? צריך חומר עכשיו?
        <br />
        מצא התאמה בלי לחפש בקבוצות וואטסאפ.
      </h1>
      <p className="text-stone-600 mt-2">
        חול, חמרה ומצע — לפי מיקום, כמות וזמן, במרכז הארץ.
      </p>

      {!user && (
        <Link href="/register" className="btn-primary w-full mt-5">
          הרשמה מהירה
        </Link>
      )}
      {user && (
        <p className="mt-5 text-sm text-stone-500">
          שלום {user.name} 👋 — מוכן לפרסם או לחפש?
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Link href="/supply" className="btn-supply">
          יש לי לתת ▲
        </Link>
        <Link href="/demand" className="btn-demand">
          אני צריך ▼
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-supply-500">{stats.supply}</div>
          <div className="text-xs text-stone-500 mt-1">היצעים פתוחים</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-demand-500">{stats.demand}</div>
          <div className="text-xs text-stone-500 mt-1">ביקושים פתוחים</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-6 text-sm">
        <Link href="/matches" className="btn-secondary flex-col !py-4">התאמות</Link>
        <Link href="/timeline" className="btn-secondary flex-col !py-4">תכנון קדימה</Link>
        <Link href="/map" className="btn-secondary flex-col !py-4">מפה</Link>
      </div>
    </main>
  );
}
