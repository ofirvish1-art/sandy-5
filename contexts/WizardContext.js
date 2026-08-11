"use client";

import { createContext, useContext, useState, useCallback } from "react";

// Item 2: "instant action trigger" — Home's cards and the bottom nav's
// FABs open the publish wizard as a bottom-sheet overlay on top of the
// current screen, instead of navigating to /supply or /demand.
const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  const [state, setState] = useState({ open: false, type: null, editId: null });

  const openWizard = useCallback((type, editId = null) => {
    setState({ open: true, type, editId });
  }, []);
  const closeWizard = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  return <WizardContext.Provider value={{ ...state, openWizard, closeWizard }}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}
