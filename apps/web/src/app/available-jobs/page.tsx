"use client";
import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  school: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  status: string | null;
};

export default function AvailableJobsPage() {
  const supabase = createClientBrowser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,school,start_date,end_date,notes,status")
        .eq("status", "open")
        .order("start_date", { ascending: true });

      if (!error && data) setJobs(data as Job[]);
      setLoading(false);
    };

    fetchJobs();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <p className="opacity-70">Loading available jobs…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Available Jobs</h1>
        <a href="/my-jobs" className="underline text-sm">
          View My Jobs
        </a>
      </div>

      {jobs.length === 0 ? (
        <p className="opacity-70">No open jobs right now.</p>
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
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
