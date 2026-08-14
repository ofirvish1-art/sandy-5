"use client"

import { Check } from "lucide-react"
import { BottomSheet } from "./bottom-sheet"
import { countActiveFilters, EMPTY_FILTERS, FILTER_GROUPS, type ListingFilters } from "./data"

export function FilterSheet({
  open,
  onClose,
  value,
  onChange,
  resultCount,
  specificDate = "",
  onSpecificDateChange,
}: {
  open: boolean
  onClose: () => void
  value: ListingFilters
  onChange: (next: ListingFilters) => void
  resultCount?: number
  specificDate?: string
  onSpecificDateChange?: (date: string) => void
}) {
  const active = countActiveFilters(value)

  function toggle(groupKey: keyof ListingFilters, option: string) {
    const arr = value[groupKey]
    const next = arr.includes(option) ? arr.filter((x) => x !== option) : [...arr, option]
    onChange({ ...value, [groupKey]: next })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="סינון מודעות">
      <div className="max-h-[62vh] space-y-5 overflow-y-auto pb-2 text-right">
        {FILTER_GROUPS.map((group) => (
          <div key={group.key}>
            <p className="mb-2 text-sm font-extrabold text-foreground">{group.label}</p>
            <div className="flex flex-wrap justify-end gap-2">
              {group.options.map((opt) => {
                const selected = value[group.key].includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(group.key, opt)}
                    aria-pressed={selected}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {selected && <Check className="size-3.5" />}
                    {opt}
                  </button>
                )
              })}
            </div>

            {/* Interactive date picker — appears when "תאריך ספציפי" is chosen (#1) */}
            {group.key === "timings" && value.timings.includes("תאריך ספציפי") && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                <label className="mb-1 block text-xs font-bold text-foreground">בחר תאריך</label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => onSpecificDateChange?.(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          disabled={active === 0}
          className="rounded-2xl border border-border px-4 py-3 text-sm font-bold text-foreground disabled:opacity-40"
        >
          נקה הכל
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
        >
          {typeof resultCount === "number" ? `הצג ${resultCount} תוצאות` : "הצג תוצאות"}
          {active > 0 ? ` · ${active} מסננים` : ""}
        </button>
      </div>
    </BottomSheet>
  )
}
