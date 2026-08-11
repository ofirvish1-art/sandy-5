"use client";

import { LEGAL_CONTENT } from "@/lib/legalContent";

// Required declaration checkboxes shown on the final wizard step before a
// listing can be published — content supplied by the client along with the
// real Terms of Service (lib/legalContent.js).
export default function PublisherDeclaration({ checked, onToggle }) {
  return (
    <div className="space-y-2 pt-1 border-t border-sage-dark/30">
      <label className="field-label !mb-1">הצהרת מפרסם</label>
      {LEGAL_CONTENT.publisherDeclaration.map((text, i) => (
        <label key={i} className="flex items-start gap-2.5 text-xs text-forest/80">
          <input
            type="checkbox"
            checked={!!checked[i]}
            onChange={() => onToggle(i)}
            className="mt-0.5 w-4 h-4 accent-olive shrink-0"
          />
          <span>{text}</span>
        </label>
      ))}
    </div>
  );
}
