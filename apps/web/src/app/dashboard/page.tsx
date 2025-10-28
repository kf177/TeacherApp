"use client";
import { useEffect, useMemo, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  school: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  status: "open" | "accepted" | string | null;
  created_by: string;
  accepted_by: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export default function Dashboard() {
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

      // Fetch jobs for the current principal (RLS ensures scope)
      const { data: jobsData, error } = await supabase
        .from("jobs")
        .select(
          "id,title,school,start_date,end_date,notes,status,created_by,accepted_by,created_at"
        )
        .order("start_date", { ascending: true });

      if (error || !jobsData) {
        setLoading(false);
        return;
      }

      setJobs(jobsData as Job[]);

      // Get all accepted_by user IDs and fetch their profiles
      const acceptedIds = Array.from(
        new Set(
          (jobsData as Job[])
            .map((j) => j.accepted_by)
            .filter((v): v is string => !!v)
        )
      );

      if (acceptedIds.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id,email,full_name")
          .in("id", acceptedIds);

        if (!pErr && profs) {
          const map: Record<string, Profile> = {};
          for (const p of profs as Profile[]) map[p.id] = p;
          setProfilesMap(map);
        }
      }

      setLoading(false);
    })();
  }, [supabase]);

  const { openJobs, acceptedJobs } = useMemo(() => {
    const open = jobs.filter((j) => j.status === "open");
    const accepted = jobs.filter((j) => j.status === "accepted");
    return { openJobs: open, acceptedJobs: accepted };
  }, [jobs]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="opacity-70">Loading dashboard…</div>
      </div>
    );
  }

  const DateBadge = ({ j }: { j: Job }) => (
    <>
      {j.start_date && (
        <span className="text-xs opacity-80">
          {j.start_date === j.end_date || !j.end_date
            ? j.start_date
            : `${j.start_date} → ${j.end_date}`}
        </span>
      )}
    </>
  );

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-8">
      {/* Header + actions */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Principal Dashboard</h1>
        <div className="flex flex-wrap gap-3">
          <a href="/profile" className="underline text-sm self-center">
            Profile
          </a>
          <a href="/jobs/new" className="border rounded px-4 py-2 text-sm font-medium">
            + Create Job
          </a>
          <a href="/jobs" className="underline text-sm self-center">
            My Jobs
          </a>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border rounded-xl p-4">
          <p className="text-xs opacity-70">Open</p>
          <p className="text-2xl font-semibold">{openJobs.length}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-xs opacity-70">Accepted</p>
          <p className="text-2xl font-semibold">{acceptedJobs.length}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-xs opacity-70">Total</p>
          <p className="text-2xl font-semibold">{jobs.length}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-xs opacity-70">Upcoming (by start date)</p>
          <p className="text-2xl font-semibold">
            {jobs.filter((j) => !!j.start_date).length}
          </p>
        </div>
      </div>

      {/* Open Jobs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Open Jobs</h2>
          <a href="/available-jobs" className="underline text-sm">
            View as Substitute
          </a>
        </div>
        {openJobs.length === 0 ? (
          <p className="opacity-70 text-sm">No open jobs right now.</p>
        ) : (
          <ul className="grid gap-3">
            {openJobs.map((j) => (
              <li key={j.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-medium">{j.title}</div>
                    {j.school && (
                      <div className="text-sm opacity-80">🏫 {j.school}</div>
                    )}
                    <div><DateBadge j={j} /></div>
                  </div>
                  <div className="flex gap-3">
                    <a href={`/jobs/${j.id}`} className="underline text-sm self-start">View</a>
                    <a href={`/jobs/${j.id}/edit`} className="underline text-sm self-start">Edit</a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Accepted Jobs */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Accepted Jobs</h2>
        {acceptedJobs.length === 0 ? (
          <p className="opacity-70 text-sm">No accepted jobs yet.</p>
        ) : (
          <ul className="grid gap-3">
            {acceptedJobs.map((j) => {
              const who = j.accepted_by ? profilesMap[j.accepted_by] : undefined;
              return (
                <li key={j.id} className="border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-medium">{j.title}</div>
                      {j.school && (
                        <div className="text-sm opacity-80">🏫 {j.school}</div>
                      )}
                      <div><DateBadge j={j} /></div>
                      <div className="text-xs opacity-70 mt-1">
                        Status: {j.status?.toUpperCase()}
                      </div>
                      {who && (
                        <div className="text-xs opacity-80">
                          Accepted by: {who.full_name ?? who.email ?? who.id}
                        </div>
                      )}
                    </div>
                    <a href={`/jobs/${j.id}`} className="underline text-sm self-start">View</a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
