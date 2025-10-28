"use client";
import { useEffect } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

export default function ProfileSync() {
  const supabase = createClientBrowser();

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) return;

      // Keep a minimal profile row in sync (id + email)
      await supabase
        .from("profiles")
        .upsert(
          { id: user.id, email: user.email ?? null },
          { onConflict: "id" }
        );
    })();
  }, [supabase]);

  return null;
}
