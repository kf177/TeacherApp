"use client";

import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

export default function Dashboard() {
  const supabase = createClientBrowser();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // get current user
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    // react to auth changes (optional)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    location.href = "/login";
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md w-full border rounded-xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {email ? (
          <>
            <p className="text-sm">Signed in as <b>{email}</b></p>
            <button onClick={onSignOut} className="border rounded-md px-3 py-2">
              Sign out
            </button>
          </>
        ) : (
          <p>Not signed in. <a href="/login" className="underline">Go to Login</a></p>
        )}
      </div>
    </div>
  );
}
