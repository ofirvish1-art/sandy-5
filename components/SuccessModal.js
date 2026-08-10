"use client";

export default function SuccessModal({ open, message, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-forest/50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-sage flex items-center justify-center text-3xl mx-auto">
          ✅
        </div>
        <p className="font-semibold text-forest">{message}</p>
        <button onClick={onClose} className="btn-olive w-full">
          הבנתי
        </button>
      </div>
    </div>
  );
}
