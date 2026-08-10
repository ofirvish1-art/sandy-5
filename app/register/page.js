"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { storeUser } from "@/lib/session";
import LegalModal from "@/components/LegalModal";
import { LEGAL_CONTENT } from "@/lib/legalContent";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [consents, setConsents] = useState({ terms: false, privacy: false, contact: false, whatsapp: false });
  const [legalOpen, setLegalOpen] = useState(null); // 'terms' | 'privacy' | null
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function toggleConsent(field) {
    setConsents((c) => ({ ...c, [field]: !c[field] }));
  }

  const allConsented = consents.terms && consents.privacy && consents.contact && consents.whatsapp;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setError("שם, טלפון ומייל הם שדות חובה");
      return;
    }
    if (!allConsented) {
      setError("יש לאשר את כל התנאים כדי להמשיך");
      return;
    }

    setLoading(true);
    const { data, error: dbError } = await supabase
      .from("users")
      .upsert(
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          consent_terms: true,
          consent_privacy: true,
          consent_contact_disclosure: true,
          consent_whatsapp_operational: true,
          consented_at: new Date().toISOString(),
        },
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
    <main className="max-w-xl mx-auto px-4 pt-10 pb-6">
      <div className="text-center mb-6">
        <h1 className="font-display font-black text-2xl text-olive">חולית</h1>
        <p className="text-forest/60 text-sm mt-1">יש עפר? צריך עפר? נפגשים בחולית.</p>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-bold text-lg mb-1">הרשמה</h2>
        <p className="text-forest/60 text-sm mb-5">כניסה מהירה — בלי סיסמה, בלי סיבוכים.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">שם מלא</label>
            <input className="field-input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="לדוגמה: יוסי כהן" />
          </div>
          <div>
            <label className="field-label">מספר טלפון</label>
            <input className="field-input" dir="ltr" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="050-1234567" />
          </div>
          <div>
            <label className="field-label">אימייל</label>
            <input className="field-input" dir="ltr" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@example.com" />
          </div>

          <div className="space-y-2.5 pt-2 border-t border-sage-dark/30">
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={consents.terms} onChange={() => toggleConsent("terms")} className="mt-0.5 w-5 h-5 accent-olive shrink-0" />
              <span>
                קראתי ואני מאשר את{" "}
                <button type="button" onClick={() => setLegalOpen("terms")} className="text-olive underline font-semibold">
                  תנאי השימוש
                </button>
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={consents.privacy} onChange={() => toggleConsent("privacy")} className="mt-0.5 w-5 h-5 accent-olive shrink-0" />
              <span>
                קראתי ואני מאשר את{" "}
                <button type="button" onClick={() => setLegalOpen("privacy")} className="text-olive underline font-semibold">
                  מדיניות הפרטיות
                </button>
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={consents.contact} onChange={() => toggleConsent("contact")} className="mt-0.5 w-5 h-5 accent-olive shrink-0" />
              <span>
                אני מאשר כי פרטי הקשר והמיקום שאפרסם במודעות עשויים להיות מוצגים למשתמשים אחרים
                לצורך יצירת קשר בנושא המודעה
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={consents.whatsapp} onChange={() => toggleConsent("whatsapp")} className="mt-0.5 w-5 h-5 accent-olive shrink-0" />
              <span>
                אני מסכים לקבל מחולית הודעות WhatsApp תפעוליות בנוגע למודעות, פניות, עסקאות,
                שינויים בסטטוס ואבטחת החשבון.
              </span>
            </label>
          </div>

          {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}

          <button type="submit" disabled={loading || !allConsented} className="btn-olive w-full">
            {loading ? "שומר…" : "הירשם / התחבר"}
          </button>
        </form>
      </div>

      <LegalModal
        open={!!legalOpen}
        content={legalOpen ? LEGAL_CONTENT[legalOpen] : null}
        onClose={() => setLegalOpen(null)}
      />
    </main>
  );
}
