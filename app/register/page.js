"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { storeUser } from "@/lib/session";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim()) {
      setError("שם וטלפון הם שדות חובה");
      return;
    }

    setLoading(true);
    // Upsert by phone: existing users just get their name/email refreshed.
    const { data, error: dbError } = await supabase
      .from("users")
      .upsert(
        { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || null },
        { onConflict: "phone" }
      )
      .select()
      .single();
    setLoading(false);

    if (dbError) {
      setError("שגיאה בשמירה. נסה שוב.");
      console.error(dbError);
      return;
    }

    storeUser(data);
    router.push("/");
  }

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <h1 className="font-display font-black text-2xl">הרשמה</h1>
      <div className="hazard-rule my-4" />
      <p className="text-stone-600 mb-5">כניסה מהירה — בלי סיסמה, בלי סיבוכים.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">שם מלא</label>
          <input
            className="field-input"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="לדוגמה: יוסי כהן"
          />
        </div>
        <div>
          <label className="field-label">טלפון</label>
          <input
            className="field-input"
            dir="ltr"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="050-1234567"
          />
        </div>
        <div>
          <label className="field-label">מייל (רשות)</label>
          <input
            className="field-input"
            dir="ltr"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="name@example.com"
          />
        </div>

        {error && <p className="text-demand-600 text-sm font-semibold">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "שומר…" : "הירשם / התחבר"}
        </button>
      </form>
    </main>
  );
}
