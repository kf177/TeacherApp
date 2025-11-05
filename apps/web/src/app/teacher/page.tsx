// File: C:\Projects\TeacherApp\apps\web\src\app\teacher\page.tsx

"use client";

import Link from "next/link";
import RoleGate from "../RoleGate";
import React, { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

type Notification = {
  id: string;
  user_id: string;
  type: string;      // 'job_requested'
  job_id: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
};

function TeacherInner() {
  const supabase = createClientBrowser();

  const [notif, setNotif] = useState<Notification | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) return;

      setUserId(user.id);

      // Pull the most recent unread job request notification
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "job_requested")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setNotif(data as Notification);
      }
    })();
  }, [supabase]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  const handleAccept = async () => {
    if (!notif || !userId || busy) return;
    setBusy("accept");

    try {
      // Load job to check dates + guard requested_sub
      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .select("id,start_date,end_date,requested_sub")
        .eq("id", notif.job_id)
        .maybeSingle();

      if (jobErr || !job) throw new Error(jobErr?.message || "Job not found.");
      if (job.requested_sub && job.requested_sub !== userId) {
        throw new Error("This request is no longer assigned to you.");
      }
      if (!job.start_date) throw new Error("Job is missing start date.");

      // 1) Accept the job
      const { error: updErr } = await supabase
        .from("jobs")
        .update({ status: "accepted", accepted_by: userId })
        .eq("id", job.id)
        .eq("requested_sub", userId);
      if (updErr) throw new Error(updErr.message);

      // 2) Mark notification as read
      await markRead(notif.id);

      // 3) Optional: add availability overrides (already handled elsewhere if you prefer)
      // (If you want it here too, we can add it later.)

      // Remove banner and nudge to My Jobs
      setNotif(null);
      window.location.href = "/my-jobs";
    } catch (e: any) {
      alert(e?.message || "Accept failed.");
      setBusy(null);
    }
  };

  const handleDecline = async () => {
    if (!notif || !userId || busy) return;
    setBusy("decline");

    try {
      // Decline only if currently requested for this teacher
      const { error } = await supabase
        .from("jobs")
        .update({ status: "declined" })
        .eq("id", notif.job_id)
        .eq("requested_sub", userId);

      if (error) throw new Error(error.message);

      await markRead(notif.id);
      setNotif(null);
    } catch (e: any) {
      alert(e?.message || "Decline failed.");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-8">
      {/* Notification banner */}
      {notif && (
        <div className="border rounded-xl p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">{notif.title}</div>
              {notif.body && <div className="text-sm opacity-80 mt-1">{notif.body}</div>}
            </div>
            <button
              className="text-sm underline opacity-70 hover:opacity-100"
              onClick={() => (markRead(notif.id), setNotif(null))}
            >
              Dismiss
            </button>
          </div>

          <div className="flex gap-3 mt-3">
            <button
              onClick={handleAccept}
              disabled={busy !== null}
              className="border rounded px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === "accept" ? "Accepting…" : "Accept"}
            </button>
            <button
              onClick={handleDecline}
              disabled={busy !== null}
              className="border rounded px-4 py-2 text-sm font-medium text-red-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === "decline" ? "Declining…" : "Decline"}
            </button>

            <Link href="/teacher/requests" className="underline text-sm self-center">
              Review requests
            </Link>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teacher — Home</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/teacher/dashboard" className="underline">Dashboard</Link>
          <Link href="/teacher/availability" className="underline">Availability</Link>
          <Link href="/teacher/profile" className="underline">Profile</Link>
        </nav>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/teacher/availability" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Set availability</h2>
          <p className="opacity-70 text-sm mt-1">
            Mark which days you’re available for the next two weeks.
          </p>
        </Link>

        <Link href="/teacher/requests" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Review requests</h2>
          <p className="opacity-70 text-sm mt-1">
            View booking requests from principals and accept or decline them.
          </p>
        </Link>

        <Link href="/teacher/profile" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Update profile</h2>
          <p className="opacity-70 text-sm mt-1">
            Name, phone, county, Teaching Council Number, and uploads.
          </p>
        </Link>
      </div>
    </div>
  );
}

export default function TeacherPage() {
  return (
    <RoleGate want="teacher" loginPath="/teacher/login">
      <TeacherInner />
    </RoleGate>
  );
}
