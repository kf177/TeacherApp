// File: C:\Projects\TeacherApp\apps\web\src\app\teacher\requests\page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";
import TeacherJobActions from "../components/teacher-job-actions";

export default function TeacherRequestsPage() {
  const supabase = createClientBrowser();
  const [jobs, setJobs] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("requested_sub", user.id)
        .eq("status", "requested")
        .order("start_date", { ascending: true });

      if (error) {
        console.error("Error fetching job requests:", error.message);
      }

      setJobs(data || []);
      setLoading(false);
    })();
  }, [supabase]);

  const removeJob = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <p className="opacity-70">Loading job requests...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-4">Job Requests</h1>

      {jobs.length === 0 ? (
        <p className="opacity-70">No job requests right now.</p>
      ) : (
        jobs.map((job) => (
          <div key={job.id} className="border rounded-xl p-4 hover:shadow-sm transition">
            <h2 className="font-semibold text-lg">{job.title}</h2>
            <p className="text-sm opacity-80">
              {job.school} — {job.start_date} {job.end_date && job.end_date !== job.start_date ? `→ ${job.end_date}` : ""}
            </p>
            {userId && (
              <TeacherJobActions
                jobId={job.id}
                teacherId={userId}
                onAction={() => removeJob(job.id)} // 👈 instantly remove
              />
            )}
          </div>
        ))
      )}
    </div>
  );
}
