"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientBrowser } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  school: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
};

// "28 Oct 2025"
function formatDate(dateString: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PrincipalPastBookings() {
  const supabase = createClientBrowser();
  const [jobs, setJobs] = useState<Job[]>([]);
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
        .select("id,title,school,start_date,end_date,status")
        .order("start_date", { ascending: false });

      if (!error && data) {
        // Past if end_date < today, or (no end_date and start_date < today)
        const filtered = (data as Job[]).filter((j) => {
          const ed = j.end_date ?? j.start_date ?? "";
          return ed < todayISO;
        });
        setJobs(filtered);
      }

      setLoading(false);
    })();
  }, [supabase]);

  if (loading)
    return <div className="min-h-screen grid place-items-center p-6">Loading…</div>;

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Past Bookings</h1>
        <Link href="/principal" className="underline text-sm">← Principal Home</Link>
      </div>

      {jobs.length === 0 ? (
        <p className="opacity-70">No past bookings.</p>
      ) : (
        <ul className="grid gap-3">
          {jobs.map((j) => (
            <li key={j.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-medium">{j.title}</div>
                  {j.school && <div className="text-sm opacity-80">🏫 {j.school}</div>}
                  {j.start_date && (
                    <div className="text-sm opacity-80">
                      📅{" "}
                      {j.end_date && j.end_date !== j.start_date
                        ? `${formatDate(j.start_date)} → ${formatDate(j.end_date)}`
                        : formatDate(j.start_date)}
                    </div>
                  )}
                  <div className="text-xs opacity-70">Status: {j.status?.toUpperCase()}</div>
                </div>
                <Link href={`/jobs/${j.id}`} className="underline text-sm self-start">
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
