"use client"

import { Check, Loader2, Star } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase/client"
import { BottomSheet } from "./bottom-sheet"

export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth()
  const [rating, setRating] = useState(0)
  const [text, setText] = useState("")
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    onClose()
    setTimeout(() => {
      setSent(false)
      setRating(0)
      setText("")
      setSending(false)
      setError(null)
    }, 300)
  }

  async function send() {
    if (sending || rating === 0) return
    setSending(true)
    setError(null)

    // `message` is NOT NULL, so a stars-only submission still needs a body.
    const message = text.trim() || `דירוג בלבד: ${rating} כוכבים`

    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: profile?.id ?? null,
      message,
      rating,
    })

    setSending(false)
    if (insertError) {
      console.error("feedback insert failed", insertError)
      setError(
        insertError.code === "PGRST204" || insertError.code === "42703"
          ? "יש להריץ את migration_011_feedback_rating.sql."
          : "שליחת המשוב נכשלה. נסה שוב.",
      )
      return
    }
    setSent(true)
  }

  return (
    <BottomSheet open={open} onClose={close} title="שיתוף משוב">
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-8" />
          </span>
          <h3 className="text-lg font-extrabold text-foreground">תודה על המשוב!</h3>
          <p className="text-sm text-muted-foreground">כל הערה עוזרת לנו לשפר את סנדיט.</p>
        </div>
      ) : (
        <div className="space-y-4 text-right">
          <p className="text-sm text-muted-foreground">איך היתה החוויה שלך עם סנדיט?</p>
          <div className="flex justify-center gap-2" dir="ltr">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} כוכבים`}>
                <Star className={`size-8 ${n <= rating ? "fill-warning text-warning" : "text-border"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="ספר לנו מה אפשר לשפר..."
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
          />
          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-bold text-destructive">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={rating === 0 || sending}
            onClick={send}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {sending && <Loader2 className="size-4 animate-spin" />}
            {sending ? "שולח…" : "שלח משוב"}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
