import { Rubik, Assistant } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthGate from "@/components/AuthGate";
import { FilterProvider } from "@/contexts/FilterContext";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700", "900"],
  variable: "--font-rubik",
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata = {
  title: "חולית — מרקטפלייס עודפי עפר וחומרי מילוי",
  description: "הפלטפורמה המובילה בישראל לקבלני עפר, עודפי חול וחומרי מילוי — לפי מיקום, כמות וזמן.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#3A523D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${assistant.variable}`}>
      <body className="font-body bg-cream text-forest min-h-screen">
        <AuthGate>
          <FilterProvider>
            <div className="pb-20 md:pb-0 md:pr-20">{children}</div>
            <BottomNav />
          </FilterProvider>
        </AuthGate>
      </body>
    </html>
  );
}
