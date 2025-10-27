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

export default function JobDetailClient({ id }: { id: string }) {
  const supabase = createClientBrowser();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (!error) setJob(data as Job);
      setLoading(false);
    })();
  }, [id, supabase]);

  const handleDelete = async () => {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      alert("Error deleting job: " + error.message);
    } else {
      window.location.href = "/jobs";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="opacity-70">Loading…</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <p className="opacity-70">Job not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto space-y-4">
      <a href="/jobs" className="underline text-sm">
        ← Back to Jobs
      </a>

      <h1 className="text-2xl font-bold">{job.title}</h1>

      {/* --- Job Dates --- */}
      {job.start_date && (
        <p className="opacity-80">
          📅{" "}
          {job.start_date === job.end_date || !job.end_date
            ? `Date: ${job.start_date}`
            : `Dates: ${job.start_date} → ${job.end_date}`}
        </p>
      )}

      {/* --- School --- */}
      {job.school && <p className="opacity-80">🏫 School: {job.school}</p>}

      {/* --- Notes --- */}
      {job.notes && <p className="mt-2 whitespace-pre-wrap">{job.notes}</p>}

      {/* --- Created Timestamp --- */}
      <p className="text-xs opacity-60 mt-4">
        Created: {new Date(job.created_at).toLocaleString()}
      </p>

      {/* --- Actions --- */}
      <div className="flex gap-3 mt-6">
        <a
          href={`/jobs/${job.id}/edit`}
          className="underline text-sm font-medium"
        >
          Edit
        </a>
        <button
          onClick={handleDelete}
          className="underline text-sm font-medium text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
