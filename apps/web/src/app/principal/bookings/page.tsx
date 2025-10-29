// apps/web/src/app/principal/bookings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RoleGate from "../../RoleGate";
import { createClientBrowser } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  school: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "open" | "requested" | "accepted" | string | null;
  requested_teacher?: string | null; // new
  requested_sub?: string | null;     // legacy (fallback)
  accepted_by: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function formatDate(dateString: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString; // show raw if invalid
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StatusPill({ status }: { status: Job["status"] }) {
  const s = (status ?? "").toLowerCase();
  const styles =
    s === "accepted"
      ? "bg-green-100 text-green-800 border-green-200"
      : s === "requested"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : s === "open"
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-gray-100 text-gray-800 border-gray-200";
  const label = s ? s[0].toUpperCase() + s.slice(1) : "Unknown";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${styles}`}>
      {label}
    </span>
  );
}

function PrincipalBookingsInner() {
  const supabase = createClientBrowser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = "/principal/login";
        return;
      }

      // Load relevant jobs (open/requested/accepted), upcoming or ongoing only
      const todayISO = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id,title,school,start_date,end_date,status,requested_teacher,requested_sub,accepted_by"
        )
        .or("status.eq.open,status.eq.requested,status.eq.accepted")
        .order("start_date", { ascending: true });

      if (error) {
        setErr(error.message);
        setJobs([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Job[];

      // Compute upcoming/current
      const upcoming = rows.filter((j) => {
        const ed = j.end_date ?? j.start_date ?? "";
        return ed >= todayISO;
      });

      setJobs(upcoming);

      // Collect unique IDs for requested + accepted teachers
      const ids = new Set<string>();
      for (const j of upcoming) {
        const reqId = (j.requested_teacher ?? j.requested_sub) || null;
        if (reqId) ids.add(reqId);
        if (j.accepted_by) ids.add(j.accepted_by);
      }

      if (ids.size > 0) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(ids));

        if (!pErr && profs) {
          const map: Record<string, Profile> = {};
          for (const p of profs as Profile[]) map[p.id] = p;
          setProfilesMap(map);
        } else if (pErr) {
          // Non-fatal; we'll show raw ids
          setErr((e) => e ?? `Profiles lookup failed: ${pErr.message}`);
        }
      }

      setLoading(false);
    })();
  }, [supabase]);

  const hasJobs = useMemo(() => jobs.length > 0, [jobs]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center p-6">Loading…</div>;
  }

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <Link href="/principal" className="underline text-sm">
          ← Principal Home
        </Link>
      </div>

      {err && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 text-sm">
          {err}
        </div>
      )}

      {!hasJobs ? (
        <p className="opacity-70">No current or upcoming bookings.</p>
      ) : (
        <ul className="grid gap-3">
          {jobs.map((j) => {
            const requestedId = j.requested_teacher ?? j.requested_sub ?? null;
            const requested = requestedId ? profilesMap[requestedId] : undefined;
            const accepted = j.accepted_by ? profilesMap[j.accepted_by] : undefined;

            return (
              <li key={j.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{j.title}</div>
                      <StatusPill status={j.status} />
                    </div>

                    {j.school && (
                      <div className="text-sm opacity-80">🏫 {j.school}</div>
                    )}

                    {j.start_date && (
                      <div className="text-sm opacity-80">
                        📅{" "}
                        {j.end_date && j.end_date !== j.start_date
                          ? `${formatDate(j.start_date)} → ${formatDate(j.end_date)}`
                          : formatDate(j.start_date)}
                      </div>
                    )}

                    {/* Requested teacher (if any) */}
                    {requestedId && (
                      <div className="text-sm opacity-80">
                        👤 Requested:{" "}
                        {requested
                          ? requested.full_name ?? requested.email ?? requested.id
                          : requestedId}
                      </div>
                    )}

                    {/* Accepted by (if any) */}
                    {j.accepted_by && (
                      <div className="text-sm opacity-80">
                        ✅ Accepted by:{" "}
                        {accepted
                          ? accepted.full_name ?? accepted.email ?? accepted.id
                          : j.accepted_by}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 shrink-0">
                    <Link href={`/jobs/${j.id}`} className="underline text-sm">
                      View
                    </Link>
                    <Link href={`/jobs/${j.id}/edit`} className="underline text-sm">
                      Edit
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PrincipalBookingsPage() {
  return (
    <RoleGate want="principal" loginPath="/principal/login">
      <PrincipalBookingsInner />
    </RoleGate>
  );
}
