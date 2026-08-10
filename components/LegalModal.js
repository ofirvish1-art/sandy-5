"use client";

export default function LegalModal({ open, content, onClose }) {
  if (!open || !content) return null;
  return (
    <div className="fixed inset-0 z-50 bg-forest/50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] flex flex-col">
        <h3 className="font-display font-bold text-lg mb-3">{content.title}</h3>
        <div className="overflow-y-auto text-sm text-forest/70 whitespace-pre-line flex-1">
          {content.body}
        </div>
        <button onClick={onClose} className="btn-olive w-full mt-4">
          סגור
        </button>
      </div>
    </div>
  );
}
