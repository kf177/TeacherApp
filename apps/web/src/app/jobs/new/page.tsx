// C:\Projects\TeacherApp\apps\web\src\app\jobs\new\page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import RoleGate from "@/app/RoleGate"; // gate for principal

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role?: string | null;
};

type PublicTeacher = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  county: string | null;
};

function NewJobInner() {
  const supabase = createClientBrowser();
  const searchParams = useSearchParams();

  const preSelectedTeacher =
    searchParams.get("teacherId") ?? searchParams.get("subId") ?? "";

  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [teachersQuery, setTeachersQuery] = useState("");
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    school: "",
    notes: "",
    start_date: "",
    end_date: "",
    requested_teacher: preSelectedTeacher,
  });

  // Modal state (profile preview)
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PublicTeacher | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  useEffect(() => {
    if (preSelectedTeacher && !form.requested_teacher) {
      setForm((f) => ({ ...f, requested_teacher: preSelectedTeacher }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSelectedTeacher]);

  // Load teachers via RPC (principal-safe)
  useEffect(() => {
    (async () => {
      setLoadingTeachers(true);
      setTeachersError(null);

      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) {
        window.location.href = "/principal/login";
        return;
      }

      const { data, error } = await supabase.rpc("get_teachers_for_principal");
      if (error) {
        console.error("get_teachers_for_principal error:", error);
        setTeachersError(error.message);
        setTeachers([]);
      } else {
        const list = (data ?? []).filter((t: any) => t.id !== user.id);
        setTeachers(list as Profile[]);
      }
      setLoadingTeachers(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTeachers = useMemo(() => {
    const q = teachersQuery.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = (t.full_name ?? "").toLowerCase();
      const email = (t.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [teachers, teachersQuery]);

  // Preview panel (pull from a restricted view)
  const openPreview = async (teacherId: string) => {
    setPreviewId(teacherId);
    setPreview(null);
    setPreviewErr(null);
    setLoadingPreview(true);

    // Prefer privacy-safe view
    let { data, error } = await supabase
      .from("profiles_public")
      .select("id, full_name, email, avatar_url, county")
      .eq("id", teacherId)
      .maybeSingle();

    // Fallback: if view not present, read limited columns from profiles (requires policy)
    if (error) {
      const fb = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, county")
        .eq("id", teacherId)
        .maybeSingle();
      data = fb.data;
      error = fb.error || null;
    }

    if (error) {
      console.error("teacher preview error:", error);
      setPreviewErr(error.message);
      setPreview(null);
    } else if (data) {
      setPreview(data as PublicTeacher);
    } else {
      setPreviewErr("Teacher not found.");
    }

    setLoadingPreview(false);
  };

  const closePreview = () => {
    setPreviewId(null);
    setPreview(null);
    setPreviewErr(null);
    setLoadingPreview(false);
  };

  const selectFromPreview = () => {
    if (previewId) setForm((f) => ({ ...f, requested_teacher: previewId }));
    closePreview();
  };

  const clearTeacher = () => {
    setForm((f) => ({ ...f, requested_teacher: "" }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      setBusy(false);
      return;
    }

    const willRequest = !!form.requested_teacher;

    const { error } = await supabase.from("jobs").insert({
      title: form.title,
      school: form.school || null,
      notes: form.notes || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      created_by: user.id,
      requested_teacher: form.requested_teacher || null,
      status: willRequest ? "requested" : "open",
    });

    setBusy(false);

    if (error) {
      alert("Error creating booking: " + error.message);
    } else {
      window.location.href = "/principal/bookings";
    }
  };

  const SelectedTeacherBadge = () => {
    if (!form.requested_teacher) return null;
    const who = teachers.find((t) => t.id === form.requested_teacher);
    if (!who) return null;
    return (
      <div className="flex items-center justify-between rounded-lg border p-2 text-sm">
        <div>
          <div className="font-medium">{who.full_name ?? "Unnamed Teacher"}</div>
          <div className="opacity-80">{who.email ?? who.id}</div>
        </div>
        <button
          type="button"
          className="underline ml-3"
          onClick={clearTeacher}
          title="Remove selected teacher"
        >
          Clear
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create New Booking</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Booking form */}
        <div className="md:col-span-2">
          <form onSubmit={onSubmit} className="border rounded-xl p-6 space-y-3">
            <label className="block text-sm font-medium">Title</label>
            <input
              className="w-full border rounded p-2"
              placeholder="e.g., 5th Class Cover"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <label className="block text-sm font-medium">School</label>
            <input
              className="w-full border rounded p-2"
              placeholder="School"
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  className="w-full border rounded p-2"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">End Date</label>
                <input
                  type="date"
                  className="w-full border rounded p-2"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <label className="block text-sm font-medium">Notes</label>
            <textarea
              className="w-full border rounded p-2"
              placeholder="Notes (optional)"
              rows={4}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="space-y-2">
              <div className="text-sm font-medium">Selected teacher (optional)</div>
              <SelectedTeacherBadge />
              {!form.requested_teacher && (
                <p className="text-xs opacity-70">
                  If none selected, the booking will be posted as <b>open</b>.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button disabled={busy} className="border rounded p-2 px-4 font-medium">
                {busy ? "Creating…" : "Create Booking"}
              </button>
              <a href="/principal" className="underline">Cancel</a>
            </div>
          </form>
        </div>

        {/* Right: Teachers list / preview */}
        <aside className="md:col-span-1 border rounded-xl p-4 h-fit">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Teachers</h2>
            <div className="text-xs opacity-70">
              {loadingTeachers ? "Loading…" : teachersError ? "Error" : null}
            </div>
          </div>

          {teachersError && (
            <div className="text-xs text-red-600 mb-2 break-words">
              Failed to load teachers: {teachersError}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <input
              className="w-full border rounded p-2"
              placeholder="Search name or email…"
              value={teachersQuery}
              onChange={(e) => setTeachersQuery(e.target.value)}
              disabled={loadingTeachers}
            />
            <a href="/principal/teachers" className="underline text-xs">View all</a>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {loadingTeachers ? (
              <div className="text-sm opacity-70">Loading teachers…</div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-sm opacity-70">No matching teachers.</div>
            ) : (
              filteredTeachers.map((t) => (
                <div key={t.id} className="border rounded-lg p-2">
                  <div className="font-medium text-sm">
                    {t.full_name ?? "Unnamed Teacher"}
                  </div>
                  <div className="text-xs opacity-80">{t.email ?? t.id}</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => openPreview(t.id)}
                      className="border rounded px-2 py-1 text-xs hover:bg-gray-50"
                      title="Preview profile"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, requested_teacher: t.id }))}
                      className="border rounded px-2 py-1 text-xs hover:bg-gray-50"
                      title="Select this teacher"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Modal: Teacher profile preview */}
      {previewId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closePreview} aria-hidden />
          <div className="absolute inset-x-0 top-12 mx-auto max-w-lg w-[92%]">
            <div className="bg-white border rounded-2xl shadow-xl p-5">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">Teacher profile</h3>
                <button onClick={closePreview} className="text-sm underline">Close</button>
              </div>

              {loadingPreview ? (
                <div className="py-10 text-center opacity-70">Loading…</div>
              ) : previewErr ? (
                <div className="py-6 text-red-600 text-sm">Failed to load: {previewErr}</div>
              ) : preview ? (
                <div className="mt-3 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border bg-gray-50 shrink-0">
                      {preview.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-xs opacity-60">No photo</div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{preview.full_name ?? "Unnamed Teacher"}</div>
                      <div className="text-sm opacity-80">{preview.email ?? preview.id}</div>
                      {preview.county && (<div className="text-sm opacity-80">County: {preview.county}</div>)}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={selectFromPreview} className="border rounded px-3 py-2 text-sm font-medium hover:bg-gray-50">
                      Select for booking
                    </button>
                    <button type="button" onClick={closePreview} className="underline text-sm">
                      Cancel
                    </button>
                  </div>

                  <p className="text-xs opacity-60">
                    Note: Full details (phone, TCN, qualifications) are private to the teacher and not shown here.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewJobPage() {
  return (
    <RoleGate want="principal" loginPath="/principal/login">
      <NewJobInner />
    </RoleGate>
  );
}
