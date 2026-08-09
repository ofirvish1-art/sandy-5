"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser, storeUser, clearStoredUser } from "@/lib/session";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (u) {
      setForm({ name: u.name, email: u.email || "" });
      loadListings(u.id);
    }
  }, []);

  async function loadListings(userId) {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setMyListings(data || []);
  }

  async function handleSave() {
    const { data } = await supabase
      .from("users")
      .update({ name: form.name, email: form.email || null })
      .eq("id", user.id)
      .select()
      .single();
    if (data) {
      storeUser(data);
      setUser(data);
    }
    setEditing(false);
  }

  function handleLogout() {
    clearStoredUser();
    router.push("/");
  }

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
        <h1 className="font-display font-black text-2xl">פרופיל</h1>
        <div className="hazard-rule my-4" />
        <p className="text-stone-600">עדיין לא נרשמת.</p>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <h1 className="font-display font-black text-2xl">פרופיל</h1>
      <div className="hazard-rule my-4" />

      <div className="card p-4 space-y-3">
        {editing ? (
          <>
            <div>
              <label className="field-label">שם</label>
              <input
                className="field-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">מייל</label>
              <input
                className="field-input"
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <button onClick={handleSave} className="btn-primary w-full">
              שמור
            </button>
          </>
        ) : (
          <>
            <div>
              <div className="text-xs text-stone-400">שם</div>
              <div className="font-bold">{user.name}</div>
            </div>
            <div>
              <div className="text-xs text-stone-400">טלפון</div>
              <div className="font-bold" dir="ltr">{user.phone}</div>
            </div>
            <div>
              <div className="text-xs text-stone-400">מייל</div>
              <div className="font-bold">{user.email || "—"}</div>
            </div>
            <button onClick={() => setEditing(true)} className="btn-secondary w-full">
              עריכה
            </button>
          </>
        )}
        <button onClick={handleLogout} className="text-sm text-demand-600 font-semibold w-full text-center pt-1">
          יציאה
        </button>
      </div>

      <h2 className="font-display font-bold text-lg mt-6 mb-2">הפרסומים שלי</h2>
      <div className="space-y-2">
        {myListings.length === 0 && <p className="text-stone-500 text-sm">עדיין לא פרסמת כלום.</p>}
        {myListings.map((l) => (
          <div key={l.id} className="card px-4 py-3 flex items-center justify-between text-sm">
            <span className="font-semibold">
              {l.type === "supply" ? "היצע" : "ביקוש"} · {l.material_type} · {l.quantity_cubic} קוב
            </span>
            <span className="text-xs px-2 py-1 rounded-lg bg-stone-100 font-semibold">{l.status}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
