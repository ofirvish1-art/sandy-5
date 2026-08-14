"use client"

import { X } from "lucide-react"
import { useEffect } from "react"

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col justify-end">
      {/* backdrop */}
      <button
        type="button"
        aria-label="סגור"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 animate-in fade-in"
      />
      <div className="relative flex max-h-[92vh] flex-col rounded-t-3xl bg-card shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="text-lg font-extrabold text-foreground">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-border px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}
