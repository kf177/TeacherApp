"use client";
import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  school: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export default function JobsPage() {
  const supabase = createClientBrowser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchJobs = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,school,notes,start_date,end_date,created_at")
        .order("created_at", { ascending: false });

      if (!error && data && isMounted) setJobs(data as Job[]);
      setLoading(false);
    };

    fetchJobs();

    // Refetch when returning to the tab or focus
    const onFocus = () => fetchJobs();
    const onVisible = () => {
      if (!document.hidden) fetchJobs();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="opacity-70">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <a
          href="/jobs/new"
          className="border rounded p-2 px-4 text-sm font-medium hover:bg-gray-50"
        >
          + Create Job
        </a>
      </div>

      {jobs.length === 0 ? (
        <p className="opacity-70">No jobs yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <a
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block border rounded-xl p-4 hover:shadow-sm transition space-y-1"
            >
              <h2 className="text-lg font-semibold">{job.title}</h2>

              {job.school && (
                <p className="text-sm opacity-80">🏫 {job.school}</p>
              )}

              {job.start_date && (
                <p className="text-sm opacity-80">
                  📅{" "}
                  {job.start_date === job.end_date || !job.end_date
                    ? job.start_date
                    : `${job.start_date} → ${job.end_date}`}
                </p>
              )}

              {job.notes && (
                <p className="text-sm opacity-70 line-clamp-2">
                  📝 {job.notes.slice(0, 120)}
                </p>
              )}

              <p className="text-xs opacity-60">
                Created: {new Date(job.created_at).toLocaleString()}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
