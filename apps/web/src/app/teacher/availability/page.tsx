// apps/web/src/app/teacher/availability/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "../../RoleGate";
import { createClientBrowser } from "@/lib/supabaseClient";

type AvailRow = {
  id?: number;
  user_id: string;
  weekday: number;          // 1..5 (Mon..Fri)
  is_available: boolean;
  effective_from: string;   // YYYY-MM-DD (Monday of that week)
};

const WEEKDAYS = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
];

// ---------- date helpers ----------
const pad = (x: number) => (x < 10 ? `0${x}` : `${x}`);
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
const snapToMonday = (d: Date) => {
  const dow = d.getDay();           // 0=Sun..6=Sat
  const delta = (dow + 6) % 7;      // 0 if Mon, 1 if Tue, ... 6 if Sun
  return addDays(d, -delta);
};
const pretty = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
const dateForWeekday = (weekStart: string, weekday: number): Date =>
  addDays(new Date(weekStart + "T00:00:00"), weekday - 1);

// Default window = current week’s Monday
const DEFAULT_START = toYMD(snapToMonday(new Date()));

export default function TeacherAvailabilityPage() {
  return (
    <RoleGate want="teacher" loginPath="/teacher/login">
      <AvailabilityInner />
    </RoleGate>
  );
}

function AvailabilityInner() {
  const supabase = createClientBrowser();

  const [uid, setUid] = useState<string | null>(null);
  const [week1Start, setWeek1Start] = useState<string>(DEFAULT_START);         // Monday
  const week2Start = useMemo(
    () => toYMD(addDays(new Date(week1Start + "T00:00:00"), 7)),
    [week1Start]
  );

  const [rows, setRows] = useState<AvailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load user id & rows for both weeks (current window)
  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) {
        window.location.href = "/teacher/login";
        return;
      }
      setUid(user.id);

      const { data, error } = await supabase
        .from("availability")
        .select("id,user_id,weekday,is_available,effective_from")
        .eq("user_id", user.id)
        .in("effective_from", [week1Start, week2Start])
        .order("effective_from", { ascending: true })
        .order("weekday", { ascending: true });

      const existing = (error || !data ? [] : (data as AvailRow[]));

      const ensureWeek = (start: string) =>
        WEEKDAYS.map((d) => {
          const found = existing.find(
            (r) => r.effective_from === start && r.weekday === d.n
          );
          return (
            found ?? {
              user_id: user.id,
              weekday: d.n,
              is_available: false,
              effective_from: start,
            }
          );
        });

      setRows([...ensureWeek(week1Start), ...ensureWeek(week2Start)]);
      setLoading(false);
    })();
  }, [supabase, week1Start, week2Start]);

  // Toggle availability by (whichWeek, weekday)
  const toggle = (whichWeek: 1 | 2, weekday: number) => {
    const start = whichWeek === 1 ? week1Start : week2Start;
    setRows((prev) =>
      prev.map((r) =>
        r.effective_from === start && r.weekday === weekday
          ? { ...r, is_available: !r.is_available }
          : r
      )
    );
  };

  // Save both weeks in the current window
  const save = async () => {
    if (!uid) return;
    setSaving(true);

    const payload = rows
      .filter((r) => r.effective_from === week1Start || r.effective_from === week2Start)
      .map((r) => ({
        user_id: uid,
        weekday: r.weekday,
        is_available: r.is_available,
        effective_from: r.effective_from,
      }));

    const { error } = await supabase
      .from("availability")
      .upsert(payload, { onConflict: "user_id,weekday,effective_from" });

    setSaving(false);
    if (error) alert("Save failed: " + error.message);
    else alert("Availability saved ✅");
  };

  // Two-week navigator
  const shiftWindow = (days: number) => {
    const snapped = snapToMonday(addDays(new Date(week1Start + "T00:00:00"), days));
    setWeek1Start(toYMD(snapped));
  };

  // Snap any chosen date to Monday
  const handleStartChange = (val: string) => {
    const snapped = snapToMonday(new Date(val + "T00:00:00"));
    setWeek1Start(toYMD(snapped));
  };

  // UI helpers
  const WeekCard = ({ start, which }: { start: string; which: 1 | 2 }) => {
    const header = `Week of ${pretty(new Date(start + "T00:00:00"))}`;
    return (
      <div className="border rounded-xl p-4 space-y-4">
        <div className="font-semibold">{header}</div>
        <div className="grid grid-cols-5 gap-2">
          {WEEKDAYS.map((d) => {
            const checked =
              rows.find((r) => r.effective_from === start && r.weekday === d.n)?.is_available ??
              false;
            const calendarDate = dateForWeekday(start, d.n);
            return (
              <button
                key={`${which}-${d.n}`}
                type="button"
                onClick={() => toggle(which, d.n)}
                className={`border rounded-xl py-4 font-semibold ${
                  checked ? "ring-2 ring-blue-500" : "hover:bg-gray-50"
                }`}
                title={`Toggle ${d.label}`}
              >
                {d.label}
                <div className="text-xs opacity-70 mt-1">{pretty(calendarDate)}</div>
                <div className="text-xs opacity-70">
                  {checked ? "Available" : "Unavailable"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
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
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="grid gap-2 sm:grid-cols-[160px_1fr] items-center">
            <label className="text-sm font-medium">Effective from (Monday)</label>
            <input
              type="date"
              className="border rounded p-2"
              value={week1Start}
              onChange={(e) => handleStartChange(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => shiftWindow(-14)}
              className="border rounded px-3 py-2 text-sm"
              title="Previous 2 weeks"
            >
              ← Prev 2 weeks
            </button>
            <button
              type="button"
              onClick={() => shiftWindow(14)}
              className="border rounded px-3 py-2 text-sm"
              title="Next 2 weeks"
            >
              Next 2 weeks →
            </button>
          </div>
        </div>

        {/* Two-week view */}
        <div className="grid gap-4">
          <WeekCard start={week1Start} which={1} />
          <WeekCard start={week2Start} which={2} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="border rounded px-4 py-2 font-medium"
          >
            {saving ? "Saving…" : "Save Availability"}
          </button>
          <span className="text-xs opacity-70">
            Tip: use Prev/Next to move by 2 weeks, or pick any date to jump.
          </span>
        </div>
      </div>
    </div>
  );
}
