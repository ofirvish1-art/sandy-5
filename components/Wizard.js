"use client";

// Generic step-wizard shell: step dots, a title, and Back/Next controls.
// The parent owns the form state; this just renders chrome around it.
export default function Wizard({ step, totalSteps, title, onBack, onNext, nextLabel, nextDisabled, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} className={i === step ? "step-dot-active" : "step-dot"} />
        ))}
        <span className="text-xs text-forest/50 ms-2">
          שלב {step + 1} מתוך {totalSteps}
        </span>
      </div>

      <h2 className="font-display font-bold text-lg mb-4">{title}</h2>

      <div className="space-y-4">{children}</div>

      <div className="flex gap-3 pt-6">
        {step > 0 && (
          <button type="button" onClick={onBack} className="btn-secondary flex-1">
            הקודם
          </button>
        )}
        <button type="button" onClick={onNext} disabled={nextDisabled} className="btn-olive flex-1">
          {nextLabel || "הבא"}
        </button>
      </div>
    </div>
  );
}
