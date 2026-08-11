"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/contexts/WizardContext";
import SupplyWizardForm from "@/components/wizards/SupplyWizardForm";
import DemandWizardForm from "@/components/wizards/DemandWizardForm";

const TITLES = {
  supply: "פרסום חומר זמין",
  demand: "פרסום בקשת חומר",
};

// Item 2: instant action trigger — Home's cards and the bottom nav's FABs
// call openWizard() (see contexts/WizardContext.js) which mounts this as a
// bottom sheet over whatever screen the user is already on, no navigation.
export default function WizardModal() {
  const router = useRouter();
  const { open, type, editId, closeWizard } = useWizard();
  if (!open) return null;

  function handleSuccess() {
    closeWizard();
    router.push("/matches");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-forest/50" onClick={closeWizard} />
      <div className="relative w-full max-w-xl bg-cream rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col animate-sheet-up">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-sage-dark/20 shrink-0">
          <button
            onClick={closeWizard}
            aria-label="סגור"
            className="w-9 h-9 rounded-full bg-white border border-sage-dark/40 flex items-center justify-center shrink-0"
          >
            <X size={18} />
          </button>
          <h2 className="font-display font-bold text-lg">{TITLES[type] || ""}</h2>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {type === "supply" && <SupplyWizardForm editId={editId} onSuccess={handleSuccess} />}
          {type === "demand" && <DemandWizardForm editId={editId} onSuccess={handleSuccess} />}
        </div>
      </div>
    </div>
  );
}
