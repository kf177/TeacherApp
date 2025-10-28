"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClientBrowser } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  school: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  requested_sub: string | null;
  accepted_by: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

// Helper to format date as "28 Oct 2025"
function formatDate(dateString: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PrincipalBookings() {
  const supabase = createClientBrowser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = "/login";
        return;
      }

      const todayISO = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id,title,school,start_date,end_date,status,requested_sub,accepted_by"
        )
        .or("status.eq.open,status.eq.requested,status.eq.accepted")
        .order("start_date", { ascending: true });

      if (!error && data) {
        // upcoming/current only
        const upcoming = (data as Job[]).filter((j) => {
          const ed = j.end_date ?? j.start_date ?? "";
          return ed >= todayISO;
        });

        setJobs(upcoming);

        // Collect unique requested_sub IDs to fetch names/emails
        const requestedIds = Array.from(
          new Set(
            upcoming
              .map((j) => j.requested_sub)
              .filter((v): v is string => !!v)
          )
        );

        if (requestedIds.length > 0) {
          const { data: profs, error: pErr } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", requestedIds);

          if (!pErr && profs) {
            const map: Record<string, Profile> = {};
            for (const p of profs as Profile[]) map[p.id] = p;
            setProfilesMap(map);
          }
        }
      }
      setLoading(false);
    })();
  }, [supabase]);

  const hasJobs = useMemo(() => jobs.length > 0, [jobs]);

  if (loading)
    return <div className="min-h-screen grid place-items-center p-6">Loading…</div>;

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <Link href="/principal" className="underline text-sm">
          ← Principal Home
        </Link>
      </div>

      {!hasJobs ? (
        <p className="opacity-70">No current or upcoming bookings.</p>
      ) : (
        <ul className="grid gap-3">
          {jobs.map((j) => {
            const requested = j.requested_sub
              ? profilesMap[j.requested_sub]
              : undefined;

            return (
              <li key={j.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-medium">{j.title}</div>

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

                    {/* Requested sub line */}
                    {j.requested_sub && (
                      <div className="text-sm opacity-80">
                        👤 Requested for:{" "}
                        {requested
                          ? requested.full_name ?? requested.email ?? requested.id
                          : j.requested_sub}
                      </div>
                    )}

                    <div className="text-xs opacity-70">
                      Status: {j.status?.toUpperCase()}
                    </div>
                  </div>

                  <div className="flex gap-3">
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
