"use client";
import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

type Profile = { id: string; role: "principal" | "sub" | null };

export default function RoleGate({
  want,
  children,
  loginPath = "/login",   // 👈 add this default
}: {
  want: "principal" | "sub";
  children: React.ReactNode;
  loginPath?: string;      // 👈 and this prop
}) {
  const supabase = createClientBrowser();
  const [status, setStatus] = useState<"loading"|"ok"|"mismatch"|"noauth">("loading");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setStatus("noauth"); return; }
      const me = session.session.user.id;

      const { data } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", me)
        .maybeSingle();

      if (!data) { setStatus("mismatch"); return; }
      setProfile(data as Profile);

      if ((data.role ?? null) === want) setStatus("ok");
      else setStatus("mismatch");
    })();
  }, [supabase, want]);

  const switchRole = async () => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ role: want }).eq("id", profile.id);
    if (error) return alert("Could not set role: " + error.message);
    window.location.reload();
  };

  if (status === "loading") return <div className="p-6 opacity-70">Checking access…</div>;
  if (status === "noauth") { window.location.href = loginPath; return null; }

  if (status === "mismatch") {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold">Switch role?</h2>
          <p className="text-sm opacity-80">This area is for <b>{want}</b>s. Set your role to continue.</p>
          <div className="flex gap-3">
            <button onClick={switchRole} className="border rounded px-4 py-2 text-sm font-medium">
              Set role to “{want}”
            </button>
            <a href="/" className="underline text-sm self-center">Go back</a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
