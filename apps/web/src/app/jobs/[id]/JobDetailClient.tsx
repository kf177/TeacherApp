// File: C:\Projects\TeacherApp\apps\web\src\app\jobs\JobDetailClient.tsx

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
  status: string | null;
  created_by: string | null;
  accepted_by: string | null;
  requested_teacher: string | null; // ← aliased from requested_sub
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function JobDetailClient({ id }: { id: string }) {
  const supabase = createClientBrowser();
  const [job, setJob] = useState<Job | null>(null);
  const [requested, setRequested] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = "/login";
        return;
      }
      setUserId(session.session.user.id);

      // 👇 use PostgREST alias syntax columnAlias:real_column
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id,title,school,notes,start_date,end_date,status,created_by,accepted_by,requested_teacher:requested_sub,created_at"
        )
        .eq("id", id)
        .single();

      if (!error && data) {
        const j = data as Job;
        setJob(j);

        if (j.requested_teacher) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("id", j.requested_teacher)
            .maybeSingle();
          if (prof) setRequested(prof as Profile);
        }
      }
      setLoading(false);
    })();
  }, [id, supabase]);

  const handleAccept = async () => {
    if (!job || !userId) return;
    const { error } = await supabase
      .from("jobs")
      .update({ status: "accepted", accepted_by: userId })
      .eq("id", job.id)
      .eq("requested_sub", userId); // guard: only if requested for this teacher

    if (error) alert("Error accepting job: " + error.message);
    else {
      alert("✅ Job accepted successfully!");
      window.location.href = "/my-jobs";
    }
  };

  const handleRelease = async () => {
    if (!job || !userId) return;
    if (!confirm("Are you sure you want to release this job?")) return;

    const { error } = await supabase
      .from("jobs")
      .update({ status: "open", accepted_by: null })
      .eq("id", job.id)
      .eq("accepted_by", userId);

    if (error) alert("Error releasing job: " + error.message);
    else {
      alert("Job released successfully.");
      window.location.href = "/my-jobs";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) alert("Error deleting job: " + error.message);
    else window.location.href = "/jobs";
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

  const isCreator = job.created_by === userId;
  const isAcceptedByUser = job.accepted_by === userId;

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto space-y-4">
      <a href={isCreator ? "/principal/bookings" : "/available-jobs"} className="underline text-sm">
        ← Back
      </a>

      <h1 className="text-2xl font-bold">{job.title}</h1>

      {job.start_date && (
        <p className="opacity-80">
          📅{" "}
          {job.start_date === job.end_date || !job.end_date
            ? `Date: ${job.start_date}`
            : `Dates: ${job.start_date} → ${job.end_date}`}
        </p>
      )}

      {job.school && <p className="opacity-80">🏫 School: {job.school}</p>}

      {job.requested_teacher && (
        <p className="opacity-80">
          👤 Requested for:{" "}
          {requested ? requested.full_name ?? requested.email ?? requested.id : job.requested_teacher}
        </p>
      )}

      {job.notes && <p className="mt-2 whitespace-pre-wrap">{job.notes}</p>}

      <p className="text-xs opacity-60 mt-4">Status: {job.status?.toUpperCase() ?? "UNKNOWN"}</p>

      <div className="flex gap-3 mt-6 flex-wrap">
        {isCreator && (
          <>
            <a href={`/jobs/${job.id}/edit`} className="underline text-sm font-medium">
              Edit
            </a>
            <button onClick={handleDelete} className="underline text-sm font-medium text-red-600">
              Delete
            </button>
          </>
        )}

        {!isCreator && job.status === "open" && (
          <button onClick={handleAccept} className="border rounded p-2 px-4 font-medium hover:bg-gray-50">
            Accept Job
          </button>
        )}

        {!isCreator && isAcceptedByUser && (
          <button
            onClick={handleRelease}
            className="border rounded p-2 px-4 font-medium text-red-600 hover:bg-gray-50"
          >
            Release Job
          </button>
        )}
      </div>
    </div>
  );
}
