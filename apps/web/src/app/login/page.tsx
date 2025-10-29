// app/principal/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabaseClient";

type Role = "principal" | "teacher";

export default function PrincipalLogin() {
  const supabase = createClientBrowser();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const siteUrl = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    return base;
  }, []);

  async function fetchRoleByUserId(userId: string): Promise<Role | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle<{ role: Role | string | null }>();

    if (error) {
      console.error("profiles select error:", error);
      setErr(`Profiles read failed: ${error.message}`);
      return null;
    }

    const role =
      typeof data?.role === "string"
        ? (data.role.trim().toLowerCase() as Role)
        : null;

    return role ?? null;
  }

  // If a user is already signed in, route them by role
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      const role = await fetchRoleByUserId(userId);
      if (role === "principal") router.replace("/principal");
      else if (role === "teacher") {
        // prevent teachers using principal portal
        await supabase.auth.signOut();
        setErr("This portal is for principals only. Please use the Teacher login.");
      } else {
        setInfo("Your account is awaiting activation (no principal profile found). Please contact an admin.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    setInfo(null);

    try {
      if (mode === "signin") {
        // Sign in and use the returned user directly (avoid a getSession race)
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const userId = data.user?.id;
        if (!userId) {
          setErr("Signed in but no user found in session.");
          setBusy(false);
          return;
        }

        let role = await fetchRoleByUserId(userId);

        // (Optional) If there's no profiles row at all, create a basic one (no auto-role)
        if (!role) {
          // see if the row exists first
          const { data: probe, error: probeErr } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

          if (!probe && !probeErr) {
            await supabase.from("profiles").upsert({ id: userId, email });
            role = await fetchRoleByUserId(userId);
          }
        }

        if (role === "principal") {
          setBusy(false);
          router.replace("/principal");
          return;
        }

        if (role === "teacher") {
          await supabase.auth.signOut();
          setErr("This portal is for principals only. Please use the Teacher login.");
          setBusy(false);
          return;
        }

        // Still no role
        await supabase.auth.signOut();
        setInfo("Your account is awaiting activation (no principal profile found). Please contact an admin.");
        setBusy(false);
        return;
      }

      // --- SIGNUP branch ---
      const { error: upErr } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${siteUrl}/principal/login` },
      });
      if (upErr) throw upErr;

      // Depending on your auth settings, there may be no session until email confirm.
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setInfo("Account created. Check your email to confirm, then sign in here.");
        setMode("signin");
        setBusy(false);
        return;
      }

      // If immediate session is enabled, ensure a profile row exists (no auto-role)
      await supabase.from("profiles").upsert({
        id: sess.session.user.id,
        email,
      });

      const role = await fetchRoleByUserId(sess.session.user.id);
      if (role === "principal") {
        setBusy(false);
        router.replace("/principal");
        return;
      }

      await supabase.auth.signOut();
      setInfo("Signed up, but your principal profile isn’t active yet. Please contact an admin.");
      setBusy(false);
      return;
    } catch (e: any) {
      const msg = (e?.message ?? "Authentication failed").toString();
      if (msg.toLowerCase().includes("already")) {
        setErr("This email is already registered. Switch to Sign in.");
        setMode("signin");
      } else {
        setErr(msg);
      }
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email) return alert("Enter your email first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/principal/login`,
    });
    if (error) alert(error.message);
    else alert("Password reset email sent.");
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="max-w-sm w-full border rounded-xl p-6 space-y-3">
        <h1 className="text-2xl font-bold">
          {mode === "signin" ? "Principal Sign in" : "Create Principal Account"}
        </h1>

        {err && <div className="p-2 text-sm border rounded bg-red-50">{err}</div>}
        {info && <div className="p-2 text-sm border rounded bg-yellow-50">{info}</div>}

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
          <button type="button" onClick={resetPassword} className="underline">
            Forgot password?
          </button>
        </div>
      </form>
    </div>
  );
}
