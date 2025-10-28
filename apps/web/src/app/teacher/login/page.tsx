"use client";
import { useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

export default function TeacherLogin() {
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
      // Sign up as teacher (sub)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: "http://localhost:3000/teacher/login" },
      });
      if (error) {
        // Friendly handling for already-registered users
        if (
          error.message?.toLowerCase().includes("already registered") ||
          error.message?.toLowerCase().includes("user already exists")
        ) {
          alert("This email is already registered. Switching to Sign in.");
          setMode("signin");
          return;
        }
        throw error;
      }
    }

    // After successful sign-in only (we should have a session now)
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      // No session yet (e.g., email confirmation required or a provider mismatch)
      alert("Account created. Please sign in now.");
      setMode("signin");
      return;
    }

    // Ensure profiles row has role=sub (idempotent)
    const uid = sess.session.user.id;
    await supabase.from("profiles").upsert(
      { id: uid, email, role: "sub" },
      { onConflict: "id" }
    );

    // Go to teacher home
    window.location.href = "/teacher";
  } catch (err: any) {
    alert(err?.message ?? "Authentication failed");
  } finally {
    setBusy(false);
  }
};


  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="max-w-sm w-full border rounded-xl p-6 space-y-3">
        <h1 className="text-2xl font-bold">
          {mode === "signin" ? "Teacher Sign in" : "Create Teacher Account"}
        </h1>

        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          className="w-full border rounded p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="teacher@example.com"
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
