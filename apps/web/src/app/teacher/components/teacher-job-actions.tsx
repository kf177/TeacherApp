// File: C:\Projects\TeacherApp\apps\web\src\app\teacher\components\teacher-job-actions.tsx

"use client";

import React, { useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

function eachDateYMD(startISO: string, endISO: string) {
  const out: string[] = [];
  const start = new Date(startISO);
  const end = new Date(endISO || startISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return out;
  let d = start <= end ? new Date(start) : new Date(end);
  const last = start <= end ? end : start;
  d.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  while (d.getTime() <= last.getTime()) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push(`${yyyy}-${mm}-${dd}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

interface TeacherJobActionsProps {
  jobId: string;
  teacherId: string;
  /** Called after a successful accept/decline so parent can remove the card */
  onAction?: (type: "accepted" | "declined") => void;
}

export default function TeacherJobActions({ jobId, teacherId, onAction }: TeacherJobActionsProps) {
  const supabase = createClientBrowser();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  const handleAccept = async () => {
    if (busy) return;
    setBusy("accept");
    try {
      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .select("id,start_date,end_date,requested_sub")
        .eq("id", jobId)
        .maybeSingle();

      if (jobErr || !job) throw new Error(jobErr?.message || "Job not found.");
      if (job.requested_sub && job.requested_sub !== teacherId) {
        throw new Error("This request isn’t assigned to you.");
      }
      if (!job.start_date) throw new Error("Job is missing a start_date.");

      // Update job → accepted
      const { error: updErr } = await supabase
        .from("jobs")
        .update({ status: "accepted", accepted_by: teacherId })
        .eq("id", jobId)
        .eq("requested_sub", teacherId);

      if (updErr) throw new Error(updErr.message);

      // Mark overrides
      const days = eachDateYMD(job.start_date, job.end_date || job.start_date);
      if (days.length > 0) {
        const rows = days.map((date) => ({ teacher_id: teacherId, date, available: false }));
        const { error: ovErr } = await supabase
          .from("availability_overrides")
          .upsert(rows, { onConflict: "teacher_id,date", ignoreDuplicates: false });
        if (ovErr) throw new Error(ovErr.message);
      }

      onAction?.("accepted");
    } catch (e: any) {
      alert(e?.message || "Accept failed.");
      setBusy(null);
    }
  };

  const handleDecline = async () => {
    if (busy) return;
    setBusy("decline");
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: "declined" })
        .eq("id", jobId)
        .eq("requested_sub", teacherId);

      if (error) throw new Error(error.message);

      onAction?.("declined");
    } catch (e: any) {
      alert(e?.message || "Decline failed.");
      setBusy(null);
    }
  };

  return (
    <div className="flex gap-3 mt-4">
      <button
        onClick={handleAccept}
        disabled={busy !== null}
        className="border rounded px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        title="Accept this job"
      >
        {busy === "accept" ? "Accepting…" : "Accept"}
      </button>
      <button
        onClick={handleDecline}
        disabled={busy !== null}
        className="border rounded px-4 py-2 text-sm font-medium text-red-600 hover:bg-gray-50 disabled:opacity-50"
        title="Decline this job"
      >
        {busy === "decline" ? "Declining…" : "Decline"}
      </button>
    </div>
  );
}
