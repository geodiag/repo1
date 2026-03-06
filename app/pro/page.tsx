"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase-browser";

export default function ProPage() {
  const router = useRouter();

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/pro/dashboard");
      } else {
        router.replace("/pro/login");
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-fond-gris flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin"></div>
    </div>
  );
}
