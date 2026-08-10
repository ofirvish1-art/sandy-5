"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ListingCard from "@/components/ListingCard";
import SuccessModal from "@/components/SuccessModal";

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interestSent, setInterestSent] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("listings").select("*").eq("id", id).single();
      setListing(data);
      setLoading(false);
    }
    load();
  }, [id]);

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <button onClick={() => router.back()} className="text-sm text-olive font-semibold mb-4">
        → חזרה
      </button>

      {loading && <p className="text-forest/50">טוען…</p>}
      {!loading && !listing && <p className="text-forest/50">המודעה לא נמצאה — ייתכן שהוסרה.</p>}
      {listing && <ListingCard listing={listing} onExpressInterest={() => setInterestSent(true)} />}

      <SuccessModal open={interestSent} message="ההתעניינות שלך נשלחה! בעל המודעה יקבל עדכון." onClose={() => setInterestSent(false)} />
    </main>
  );
}
