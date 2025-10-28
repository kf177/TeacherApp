"use client";
import { useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

export default function PrincipalLogin() {
  const supabase = createClientBrowser();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Sign up new principal
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const userId = data.user?.id;
        if (userId) {
          // ensure profile exists and set role=principal
          await supabase.from("profiles").upsert({ id: userId, email, role: "principal" }, { onConflict: "id" });
        }
      }

      // after auth, set role to principal (idempotent) and go to Principal Home
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (uid) {
        await supabase.from("profiles").upsert({ id: uid, email, role: "principal" }, { onConflict: "id" });
      }
      window.location.href = "/principal";
    } catch (err: any) {
      alert(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="max-w-sm w-full border rounded-xl p-6 space-y-3">
        <h1 className="text-2xl font-bold">
          {mode === "signin" ? "Principal Sign in" : "Create Principal Account"}
        </h1>

        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          className="w-full border rounded p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="principal@school.ie"
        />

        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          className="w-full border rounded p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />

        <button disabled={busy} className="border rounded px-4 py-2 font-medium w-full">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>

        <div className="text-sm text-center">
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button type="button" className="underline" onClick={() => setMode("signup")}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" className="underline" onClick={() => setMode("signin")}>
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="text-xs opacity-70 text-center">
          <a href="/login" className="underline">Use magic link instead</a>
        </div>
      </form>
    </div>
  );
}
