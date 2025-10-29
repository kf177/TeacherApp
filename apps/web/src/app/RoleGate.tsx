// C:\Projects\TeacherApp\apps\web\src\app\RoleGate.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabaseClient";

type Role = "principal" | "teacher";
type Profile = { id: string; role: Role | string | null };

type GateStatus = "loading" | "ok" | "mismatch" | "noauth";

export default function RoleGate({
  want,
  children,
  loginPath = "/login",
  debug = false,
}: {
  want: Role | Role[];
  children: React.ReactNode;
  loginPath?: string;
  debug?: boolean;
}) {
  const supabase = createClientBrowser();
  const router = useRouter();
  const [status, setStatus] = useState<GateStatus>("loading");

  const allowed: Role[] = useMemo(() => {
    const raw = Array.isArray(want) ? want : [want];
    const norm = raw
      .map((r) => (typeof r === "string" ? (r.trim().toLowerCase() as Role) : r))
      .filter(Boolean) as Role[];
    const valid: Role[] = ["principal", "teacher"];
    return norm.filter((r) => valid.includes(r));
  }, [want]);
  const allowedKey = useMemo(() => JSON.stringify(allowed), [allowed]);

  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();

    const check = async () => {
      try {
        const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
        if (!mounted || ac.signal.aborted) return;

        if (sessionErr || !sessionRes.session) {
          // Not signed in → send to the correct login for this section
          setStatus("noauth");
          if (debug) console.log("[RoleGate] no session (or err), redirecting to loginPath");
          return;
        }

        const uid = sessionRes.session.user.id;

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", uid)
          .maybeSingle<Profile>();

        if (!mounted || ac.signal.aborted) return;

        if (debug) {
          console.log(
            "[RoleGate debug]",
            JSON.stringify(
              {
                path: typeof window !== "undefined" ? window.location.pathname : "",
                uid,
                prof,
                profErr: profErr
                  ? {
                      message: profErr.message,
                      details: (profErr as any).details,
                      hint: (profErr as any).hint,
                      code: (profErr as any).code,
                    }
                  : null,
                allowed,
              },
              null,
              2
            )
          );
        }

        if (profErr || !prof) {
          // Could be RLS blocked or profile not created yet.
          // Treat as unauthenticated so we redirect to the *correct* login.
          setStatus("noauth");
          return;
        }

        const role =
          typeof prof.role === "string" ? (prof.role.trim().toLowerCase() as Role) : null;

        if (role && allowed.includes(role)) {
          setStatus("ok");
        } else {
          // Signed in but wrong role → show Access denied
          setStatus("mismatch");
        }
      } catch (e) {
        if (!mounted || ac.signal.aborted) return;
        if (debug) console.error("[RoleGate] unexpected error:", e);
        // Be kind: send to login of this section
        setStatus("noauth");
      }
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (!ac.signal.aborted) check();
    });

    return () => {
      mounted = false;
      ac.abort();
      sub.subscription.unsubscribe();
    };
  }, [supabase, allowedKey, debug]);

  useEffect(() => {
    if (status === "noauth") {
      // Always send to the correct login for this section
      router.replace(loginPath);
    }
  }, [status, router, loginPath]);

  if (status === "loading" || status === "noauth") {
    return <div className="p-6 text-sm opacity-70">Checking access…</div>;
  }

  if (status === "mismatch") {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold">Access denied</h2>
          <p className="text-sm opacity-80">Your account doesn’t have access to this area.</p>
          <div className="flex gap-3">
            <a href="/" className="underline text-sm">Go Home</a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
