"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClientBrowser } from "@/lib/supabaseClient";

type Teacher = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  county: string | null;
  phone_number: string | null;
  teaching_council_number: string | null;
  qualifications_url: string | null;
};

export default function PrincipalTeachersPage() {
  const supabase = createClientBrowser();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: session } = await supabase.auth.getSession();
      const me = session.session?.user?.id;
      if (!me) { window.location.href = "/login"; return; }

      // Read ALL teacher details inline (requires RLS policy below)
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          county,
          phone_number,
          teaching_council_number,
          qualifications_url
        `)
        .eq("role", "teacher")
        .order("full_name", { ascending: true, nullsFirst: true })
        .order("email", { ascending: true, nullsFirst: true });

      if (error) {
        console.error("profiles select error:", error);
        setErr(error.message);
        setTeachers([]);
      } else {
        setTeachers((data ?? []) as Teacher[]);
      }

      setLoading(false);
    })();
  }, [supabase]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return teachers;
    return teachers.filter(t =>
      (t.full_name ?? "").toLowerCase().includes(needle) ||
      (t.email ?? "").toLowerCase().includes(needle) ||
      (t.county ?? "").toLowerCase().includes(needle) ||
      (t.phone_number ?? "").toLowerCase().includes(needle) ||
      (t.teaching_council_number ?? "").toLowerCase().includes(needle)
    );
  }, [teachers, q]);

  const displayName = (t: Teacher) => {
    if (t.full_name && t.full_name.trim()) return t.full_name;
    if (t.email) return t.email.split("@")[0]; // fallback to local-part
    return "Unnamed Teacher";
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center p-6">Loading…</div>;
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Teachers</h1>
        <Link href="/principal" className="underline text-sm">← Principal Home</Link>
      </div>

      <div className="flex items-center gap-2">
        <input
          className="w-full border rounded p-2"
          placeholder="Search by name, email, county, phone, or TCN…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Link
          href="/jobs/new"
          className="border rounded px-3 py-2 text-sm font-medium hover:shadow-sm"
        >
          + New Booking
        </Link>
      </div>

      {err && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 text-sm">
          Failed to load teachers: {err}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="opacity-70">No teachers found.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map(t => (
            <li key={t.id} className="border rounded-2xl p-4 flex gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border bg-gray-50 shrink-0">
                {t.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs opacity-60">No photo</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{displayName(t)}</div>
                <div className="text-sm opacity-80 truncate">{t.email ?? t.id}</div>

                <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
                  <div className="opacity-80">{t.county ? `County: ${t.county}` : "County: —"}</div>
                  <div className="opacity-80">{t.phone_number ? `Phone: ${t.phone_number}` : "Phone: —"}</div>
                  <div className="opacity-80">
                    {t.teaching_council_number ? `TCN: ${t.teaching_council_number}` : "TCN: —"}
                  </div>
                  <div className="opacity-80">
                    Qualifications:{" "}
                    {t.qualifications_url ? (
                      <a href={t.qualifications_url} target="_blank" className="underline">
                        View file
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <Link
                    href={`/jobs/new?teacherId=${t.id}`}
                    className="border rounded px-3 py-2 text-sm font-medium hover:shadow-sm"
                    title="Start a booking with this teacher preselected"
                  >
                    Start booking
                  </Link>
                  {t.email && (
                    <a href={`mailto:${t.email}`} className="underline text-sm">
                      Email
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
