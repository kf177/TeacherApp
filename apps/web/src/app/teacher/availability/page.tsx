// apps/web/src/app/teacher/availability/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "../../RoleGate";
import { createClientBrowser } from "@/lib/supabaseClient";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format, addYears, startOfWeek, addDays, isBefore } from "date-fns";

type AvailRow = {
  id?: number;
  user_id: string;
  weekday: number;          // 1..5 (Mon..Fri)
  is_available: boolean;
  effective_from: string;   // YYYY-MM-DD (Monday of that week)
};

const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon..Fri

// ---------- date helpers ----------
const pad = (x: number) => (x < 10 ? `0${x}` : `${x}`);
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const mondayOf = (d: Date) => startOfWeek(d, { weekStartsOn: 1 }); // Monday
const weekday1to5 = (d: Date) => {
  const w = d.getDay(); // 0..6
  // Map Mon..Fri -> 1..5; Sat/Sun invalid
  if (w === 0 || w === 6) return 0;
  return w; // Mon=1..Fri=5
};
const pretty = (d: Date) => format(d, "d MMMM yyyy");

export default function TeacherAvailabilityPage() {
  return (
    <RoleGate want="teacher" loginPath="/teacher/login">
      <AvailabilityUnlimited />
    </RoleGate>
  );
}

function AvailabilityUnlimited() {
  const supabase = createClientBrowser();

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const horizonEnd = useMemo(() => {
    // Practical fetch horizon: today -> +12 months
    // (Can extend later; keeps queries small and fast)
    const d = addYears(today, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today]);

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedInfo, setSavedInfo] = useState<string | null>(null);

  // We store normalized rows (week-monday + weekday 1..5)
  const [rows, setRows] = useState<AvailRow[]>([]);

  // selectedDates are materialized from rows (Mon–Fri only, today+)
  const selectedDates = useMemo(() => {
    const out: Date[] = [];
    for (const r of rows) {
      if (!r.is_available) continue;
      if (!WEEKDAYS.includes(r.weekday)) continue;
      const weekStart = new Date(r.effective_from + "T00:00:00");
      const date = addDays(weekStart, r.weekday - 1);
      if (!isBefore(date, today)) out.push(date);
    }
    return out;
  }, [rows, today]);

  // Helper: upsert-or-toggle a single calendar date
  const toggleDate = (day?: Date) => {
    if (!day) return;
    // Prevent past & weekends (UI also disables)
    if (isBefore(day, today)) return;
    const wd = weekday1to5(day);
    if (wd < 1 || wd > 5) return;

    const eff = toYMD(mondayOf(day)); // Monday ISO

    setRows((prev) => {
      const i = prev.findIndex(
        (r) => r.effective_from === eff && r.weekday === wd
      );
      if (i === -1) {
        // Create new row as available
        return [
          ...prev,
          {
            user_id: uid || "",
            weekday: wd,
            is_available: true,
            effective_from: eff,
          },
        ];
      } else {
        // Flip
        const copy = [...prev];
        copy[i] = { ...copy[i], is_available: !copy[i].is_available };
        return copy;
      }
    });
    setSavedInfo(null);
  };

  // Load existing availability for horizon [today .. today+1y]
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      setSavedInfo(null);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) {
        window.location.href = "/teacher/login";
        return;
      }
      setUid(user.id);

      // Compute Monday bounds for the query
      const startMonday = mondayOf(today);
      const endMonday = mondayOf(horizonEnd);
      const { data, error } = await supabase
        .from("availability")
        .select("id,user_id,weekday,is_available,effective_from")
        .eq("user_id", user.id)
        .gte("effective_from", toYMD(startMonday))
        .lte("effective_from", toYMD(endMonday))
        .order("effective_from", { ascending: true })
        .order("weekday", { ascending: true });

      if (error) {
        setErrorMsg("Failed to load: " + error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as AvailRow[]);
      }
      setLoading(false);
    })();
  }, [supabase, today, horizonEnd]);

  // Save all rows currently in state (only future weekdays are present/changed)
  const save = async () => {
    if (!uid) return;
    setSaving(true);
    setErrorMsg(null);
    setSavedInfo(null);

    const payload = rows.map((r) => ({
      user_id: uid,
      weekday: r.weekday,
      is_available: r.is_available,
      effective_from: r.effective_from,
    }));

    const { error } = await supabase
      .from("availability")
      .upsert(payload, { onConflict: "user_id,weekday,effective_from" });

    setSaving(false);
    if (error) setErrorMsg("Save failed: " + error.message);
    else setSavedInfo("Availability saved ✅");
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="opacity-70">Loading availability…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Availability</h1>
        <a href="/teacher" className="underline text-sm">← Teacher Home</a>
      </div>

      <div className="border rounded-xl p-4 space-y-4">
        {/* Calendar */}
        <div>
          <div className="text-sm font-semibold mb-2">
            Click weekdays (Mon–Fri) to toggle your availability
          </div>
          <div className="border rounded-xl p-2 inline-block">
            <DayPicker
              mode="multiple"
              selected={selectedDates}
              onDayClick={toggleDate}
              numberOfMonths={2}
              pagedNavigation
              weekStartsOn={1} // Monday UI
              disabled={[
                { dayOfWeek: [0, 6] },   // disable weekends
                { before: today },       // disable past
              ]}
              footer={
                <div className="text-xs opacity-70 mt-2">
                  Selected days are marked as <b>Available</b>. Click again to unset.
                </div>
              }
            />
          </div>
        </div>

        {/* Quick legend */}
        <div className="text-xs opacity-70">
          Today: {pretty(today)} · Range loaded through: {pretty(horizonEnd)}
        </div>

        {/* Save / feedback */}
        {errorMsg && (
          <div className="p-2 text-sm border rounded bg-red-50 text-red-900">{errorMsg}</div>
        )}
        {savedInfo && (
          <div className="p-2 text-sm border rounded bg-green-50 text-green-900">{savedInfo}</div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="border rounded px-4 py-2 font-medium"
          >
            {saving ? "Saving…" : "Save Availability"}
          </button>
          <span className="text-xs opacity-70">
            Data is stored per week (Mon) and weekday. Weekends are ignored.
          </span>
        </div>
      </div>
    </div>
  );
}
