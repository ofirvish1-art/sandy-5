import { Rubik, Assistant } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

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
  title: "מרקטפלייס קבלני עפר",
  description: "התאמות מהירות בין קבלנים לחול, חמרה ומצע — לפי מיקום, כמות וזמן.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#D98E04",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${assistant.variable}`}>
      <body className="font-body bg-stone-50 text-stone-900 min-h-screen">
        <div className="pb-20 md:pb-0 md:pr-20">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
