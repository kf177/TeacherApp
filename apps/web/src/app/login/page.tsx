"use client";
import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [working, setWorking] = useState(true);
  const supabase = createClientBrowser();

  // Handle magic-link return: exchange ?code=... for a session
  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          // This turns the code in the URL into a logged-in session cookie
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            alert(error.message);
            setWorking(false);
            return;
          }
          // Clean the URL & go to dashboard
          window.history.replaceState({}, document.title, "/login");
          window.location.href = "/dashboard";
          return;
        }

        // already signed in? go to dashboard
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.href = "/dashboard";
          return;
        }
      } finally {
        setWorking(false);
      }
    };
    run();
  }, [supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    if (error) return alert(error.message);
    setSent(true);
  };

  if (working) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="opacity-70">Checking sign-in…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="max-w-md w-full border rounded-xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {sent ? (
          <p>Check your email for a magic link, then return here.</p>
        ) : (
          <>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md p-2"
            />
            <button type="submit" className="w-full rounded-md p-2 border font-medium">
              Send magic link
            </button>
          </>
        )}
      </form>
    </div>
  );
}
