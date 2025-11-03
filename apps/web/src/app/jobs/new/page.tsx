// File: C:\Projects\TeacherApp\apps\web\src\app\jobs\new\page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabaseClient";
import { DateRange, DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format } from "date-fns";

const pretty = (d?: Date) => (d ? format(d, "d MMMM yyyy") : "");

type PerDay = { date: string; available: boolean };

type Teacher = {
  teacher_id?: string; // from RPC v2
  id?: string;         // from fallback profiles query
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  county: string | null;
  per_day?: PerDay[];  // present only when dates are selected (RPC v2)
};

type JobStatus = "open" | "requested" | "accepted" | "cancelled";

export default function NewJobPage() {
  const supabase = createClientBrowser();
  const router = useRouter();

  // --- Job form state ---
  const [title, setTitle] = useState("");
  const [school, setSchool] = useState("");
  const [notes, setNotes] = useState("");

  // We’ll keep your string dates but drive them from the calendar
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Calendar (range) state
  const [range, setRange] = useState<DateRange | undefined>();

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // --- UI state ---
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Sync calendar -> string dates (yyyy-MM-dd) that your existing logic expects
  useEffect(() => {
    const toStr = (d: Date | undefined) => (d ? format(d, "yyyy-MM-dd") : "");
    setStartDate(toStr(range?.from));
    setEndDate(toStr(range?.to ?? range?.from)); // single day if only from selected
  }, [range?.from, range?.to]);

  // Normalize the date range for queries
  const normalizedRange = useMemo(() => {
    if (!startDate && !endDate) return null;
    if (startDate && !endDate) return { start: startDate, end: startDate };
    if (!startDate && endDate) return { start: endDate, end: endDate };
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e < s) return { start: endDate, end: endDate };
    return { start: startDate, end: endDate };
  }, [startDate, endDate]);

  const getTeacherId = (t: Teacher) => t.teacher_id ?? t.id ?? "";

  // Load teachers (RPC when dates picked; fallback to all)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingTeachers(true);
      setTeachersError(null);
      setSelectedTeacherId(null);
      try {
        if (normalizedRange?.start && normalizedRange?.end) {
          const { data, error } = await supabase.rpc("rpc_available_teachers_v2", {
            _start: normalizedRange.start,
            _end: normalizedRange.end,
          });
          if (error) throw error;
          if (!mounted) return;
          setTeachers((data ?? []) as Teacher[]);
          setInfo((data ?? []).length === 0 ? "No teachers marked available for the selected dates." : null);
        } else {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url, county, role")
            .eq("role", "teacher")
            .order("full_name", { ascending: true });
          if (error) throw error;
          if (!mounted) return;
          setTeachers(
            (data ?? []).map((p: any) => ({
              id: p.id,
              full_name: p.full_name,
              email: p.email,
              avatar_url: p.avatar_url,
              county: p.county,
            }))
          );
          setInfo("Choose dates on the calendar to filter this list to only available teachers.");
        }
      } catch (e: any) {
        if (!mounted) return;
        setTeachersError(e?.message ?? "Failed to load teachers");
      } finally {
        if (mounted) setLoadingTeachers(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [supabase, normalizedRange?.start, normalizedRange?.end]);

  // Create the job
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitError(null);
    setInfo(null);

    const hasDates = !!normalizedRange?.start && !!normalizedRange?.end;
    if (!title.trim()) return setSubmitError("Please enter a job title.");
    if (!hasDates) return setSubmitError("Please choose dates on the calendar.");
    if (!selectedTeacherId) return setSubmitError("Please select a teacher.");

    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id;
      if (!userId) {
        setSubmitting(false);
        return setSubmitError("You must be signed in to create a job.");
      }

      const payload = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        title: title.trim(),
        school: school.trim() || null,
        notes: notes.trim() || null,
        created_by: userId,
        start_date: normalizedRange!.start,
        end_date: normalizedRange!.end,

        // Keep DB column as requested_sub for now (teacher-selected)
        requested_sub: selectedTeacherId,

        // If a teacher is selected, mark as requested; else open
        status: (selectedTeacherId ? "requested" : "open") as JobStatus,

        created_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase.from("jobs").insert(payload);
      if (insertErr) throw insertErr;

      router.replace(`/principal`);
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to create job.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-6">
      <h1 className="text-2xl font-bold mb-4">Create New Booking</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Job form */}
        <form onSubmit={handleCreate} className="md:col-span-2 border rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="e.g. 3rd Class Cover"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">School</label>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="e.g. St. Mary's NS"
            />
          </div>

          {/* Calendar date range picker */}
          <div>
            <label className="block text-sm font-medium mb-2">Dates</label>
            <div className="border rounded-xl p-2 inline-block">
              <DayPicker
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                pagedNavigation
                weekStartsOn={1} // Monday
                disabled={[
                  { before: new Date() },
                  { dayOfWeek: [0, 6] },
                ]}
              />
            </div>
            {/* Readout */}
            <div className="text-xs opacity-70 mt-2">
              {range && range.from ? (
                <>Selected: {pretty(range.from)} → {pretty(range.to ?? range.from)}</>
              ) : (
                <>Pick a weekday or drag to select a range (Mon–Fri only)</>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded p-2 min-h-[100px]"
              placeholder="Anything the teacher should know…"
            />
          </div>

          {submitError && (
            <div className="p-2 text-sm border rounded bg-red-50 text-red-900">{submitError}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedTeacherId}
            className="border rounded px-4 py-2 font-medium disabled:opacity-50"
            title={!selectedTeacherId ? "Select a teacher from the list first" : "Create job"}
          >
            {submitting ? "Creating…" : "Create Booking"}
          </button>
        </form>

        {/* Teacher selector */}
        <aside className="md:col-span-1 border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Teachers</h2>
            {normalizedRange ? (
              <span className="text-xs opacity-70">
                {normalizedRange.start} → {normalizedRange.end}
              </span>
            ) : (
              <span className="text-xs opacity-70">All teachers</span>
            )}
          </div>

          {teachersError && (
            <div className="p-2 text-sm border rounded bg-red-50 text-red-900">{teachersError}</div>
          )}
          {info && !teachersError && (
            <div className="p-2 text-xs border rounded bg-yellow-50 text-yellow-900 mb-2">{info}</div>
          )}

          {loadingTeachers ? (
            <div className="text-sm opacity-70">Loading teachers…</div>
          ) : teachers.length === 0 ? (
            <div className="text-sm opacity-70">No teachers to show.</div>
          ) : (
            <ul className="space-y-2 max-h-[520px] overflow-auto pr-1">
              {teachers.map((t) => {
                const id = getTeacherId(t);
                const selected = id === selectedTeacherId;
                return (
                  <li
                    key={id}
                    className={`flex items-center gap-3 border rounded-lg p-2 cursor-pointer ${
                      selected ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => setSelectedTeacherId(id)}
                    title="Select this teacher"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.avatar_url || "/favicon.ico"}
                      alt={t.full_name || "Teacher"}
                      className="w-9 h-9 rounded-full object-cover"
                    />

                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">
                        {t.full_name || "Unnamed Teacher"}
                      </div>
                      <div className="text-xs opacity-70">
                        {t.email || "—"} {t.county ? `· ${t.county}` : ""}
                      </div>

                      {/* Per-day availability badges (only when dates are selected) */}
                      {t.per_day && t.per_day.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {t.per_day.map((pd) => (
                            <span
                              key={pd.date}
                              title={`${pd.date} — ${pd.available ? "Available" : "Not available"}`}
                              className={`inline-flex items-center justify-center text-[10px] w-5 h-5 rounded ${
                                pd.available ? "border" : "border bg-red-600/20"
                              }`}
                            >
                              {pd.available ? "✓" : "×"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {selected ? (
                      <span className="text-xs px-2 py-1 border rounded">Selected</span>
                    ) : (
                      <span className="text-xs px-2 py-1 border rounded">Choose</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
