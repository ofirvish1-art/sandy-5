"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SupplyWizardForm from "@/components/wizards/SupplyWizardForm";

export const dynamic = "force-dynamic";

// Bookmarkable full-page version of the wizard — also what edit links land
// on. The same instant, no-navigation modal is available from Home / the
// bottom nav FAB (see contexts/WizardContext.js + components/WizardModal.js).
export default function SupplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <span className="chip chip-active mb-2 inline-block">היצע</span>
      <h1 className="font-display font-black text-2xl mb-5">{editId ? "עריכת מודעה" : "פרסום מודעה"}</h1>

      <div className="card p-5">
        <SupplyWizardForm editId={editId} onSuccess={() => router.push("/matches")} />
      </div>
    </main>
  );
}
