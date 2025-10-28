"use client";
import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";
import Link from "next/link";

type Job = {
  id: string;
  title: string;
  school: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  requested_sub: string | null;
  notes: string | null;
};

function formatDate(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function RequestsPage() {
  const supabase = createClientBrowser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      window.location.href = "/login";
      return;
    }
    const me = session.session.user.id;

    const { data, error } = await supabase
      .from("jobs")
      .select("id,title,school,start_date,end_date,status,requested_sub,notes")
      .eq("status", "requested")
      .eq("requested_sub", me)
      .order("start_date", { ascending: true });

    if (!error && data) setJobs(data as Job[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData.user?.id;
    if (!me) return alert("Not signed in.");

    const { error } = await supabase
      .from("jobs")
      .update({ status: "accepted", accepted_by: me })
      .eq("id", id);

    if (error) return alert("Accept failed: " + error.message);
    alert("✅ Accepted!");
    load();
  };

  const decline = async (id: string) => {
    if (!confirm("Decline this request? It will become open to others.")) return;

    const { error } = await supabase
      .from("jobs")
      .update({ status: "open", requested_sub: null })
      .eq("id", id);

    if (error) return alert("Decline failed: " + error.message);
    alert("Request declined.");
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="opacity-70">Loading requests…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Requests for You</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/available-jobs" className="underline">Available Jobs</Link>
          <Link href="/my-jobs" className="underline">My Jobs</Link>
        </div>
      </div>

      {jobs.length === 0 ? (
        <p className="opacity-70">No requests at the moment.</p>
      ) : (
        <ul className="grid gap-3">
          {jobs.map((j) => (
            <li key={j.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold">{j.title}</div>
                  {j.school && <div className="text-sm opacity-80">🏫 {j.school}</div>}
                  {j.start_date && (
                    <div className="text-sm opacity-80">
                      📅 {j.end_date && j.end_date !== j.start_date
                        ? `${formatDate(j.start_date)} → ${formatDate(j.end_date)}`
                        : formatDate(j.start_date)}
                    </div>
                  )}
                  {j.notes && (
                    <div className="text-sm opacity-80 line-clamp-2">📝 {j.notes}</div>
                  )}
                  <div className="text-xs opacity-70">Status: {j.status?.toUpperCase()}</div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => accept(j.id)}
                    className="border rounded px-3 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => decline(j.id)}
                    className="border rounded px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-50"
                  >
                    Decline
                  </button>
                  <Link href={`/jobs/${j.id}`} className="underline text-sm text-center">
                    View
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
