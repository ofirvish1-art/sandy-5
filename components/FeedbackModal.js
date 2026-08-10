"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";

export default function FeedbackModal({ open, onClose }) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!message.trim()) return;
    setLoading(true);
    const user = getStoredUser();
    await supabase.from("feedback").insert({
      user_id: user?.id || null,
      message: message.trim(),
    });
    setLoading(false);
    setSent(true);
  }

  function handleClose() {
    setMessage("");
    setSent(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-forest/50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-sage flex items-center justify-center text-3xl mx-auto">🙏</div>
            <p className="font-semibold text-forest">תודה על המשוב!</p>
            <button onClick={handleClose} className="btn-olive w-full">סגור</button>
          </div>
        ) : (
          <>
            <h3 className="font-display font-bold text-lg mb-3">💬 משוב / דירוג</h3>
            <textarea
              className="field-input"
              rows={4}
              placeholder="נשמח לשמוע מה אפשר לשפר, או מה אהבת בחולית"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={handleClose} className="btn-secondary flex-1">ביטול</button>
              <button onClick={handleSubmit} disabled={loading || !message.trim()} className="btn-olive flex-1">
                {loading ? "שולח…" : "שלח"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
