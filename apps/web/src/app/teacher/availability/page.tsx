"use client";
import { useEffect, useMemo, useState } from "react";
import RoleGate from "../../RoleGate";
import { createClientBrowser } from "@/lib/supabaseClient";

type AvailRow = {
  id?: number;
  user_id: string;
  weekday: number; // 1..5
  is_available: boolean;
  effective_from: string; // YYYY-MM-DD
};

const WEEKDAYS = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
];

const DEFAULT_START = "2025-10-27"; // Monday in your spec

export default function TeacherAvailabilityPage() {
  return (
    <RoleGate want="sub" loginPath="/teacher/login">
      <AvailabilityInner />
    </RoleGate>
  );
}

function AvailabilityInner() {
  const supabase = createClientBrowser();
  const [uid, setUid] = useState<string | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(DEFAULT_START);
  const [rows, setRows] = useState<AvailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load user + availability rows
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) { window.location.href = "/teacher/login"; return; }
      setUid(user.id);

      // fetch existing availability for the effectiveFrom date
      const { data, error } = await supabase
        .from("availability")
        .select("id,user_id,weekday,is_available,effective_from")
        .eq("user_id", user.id)
        .eq("effective_from", effectiveFrom)
        .order("weekday", { ascending: true });

      if (!error && data && data.length > 0) {
        setRows(data as AvailRow[]);
      } else {
        // initialize default rows (all false)
        setRows(
          WEEKDAYS.map((d) => ({
            user_id: user.id,
            weekday: d.n,
            is_available: false,
            effective_from: effectiveFrom,
          }))
        );
      }
      setLoading(false);
    })();
  }, [supabase, effectiveFrom]);

  const toggle = (weekday: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.weekday === weekday ? { ...r, is_available: !r.is_available } : r
      )
    );
  };

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    // Upsert all five rows for the selected effective_from date
    const payload = rows.map((r) => ({
      user_id: uid,
      weekday: r.weekday,
      is_available: r.is_available,
      effective_from: effectiveFrom,
    }));

    const { error } = await supabase
      .from("availability")
      .upsert(payload, { onConflict: "user_id,weekday,effective_from" });

    setSaving(false);
    if (error) alert("Save failed: " + error.message);
    else alert("Availability saved ✅");
  };

  const anyAvailable = useMemo(() => rows.some((r) => r.is_available), [rows]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="opacity-70">Loading availability…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Availability</h1>
        <a href="/teacher" className="underline text-sm">← Teacher Home</a>
      </div>

      <div className="border rounded-xl p-4 space-y-4">
        <div className="grid gap-2 sm:grid-cols-[160px_1fr] items-center">
          <label className="text-sm font-medium">Effective from</label>
          <input
            type="date"
            className="border rounded p-2"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-5 gap-2">
          {WEEKDAYS.map((d) => {
            const checked = rows.find((r) => r.weekday === d.n)?.is_available ?? false;
            return (
              <button
                key={d.n}
                type="button"
                onClick={() => toggle(d.n)}
                className={`border rounded-xl py-6 font-semibold ${
                  checked ? "ring-2 ring-blue-500" : "hover:bg-gray-50"
                }`}
                title={`Toggle ${d.label}`}
              >
                {d.label}
                <div className="text-xs opacity-70 mt-1">
                  {checked ? "Available" : "Unavailable"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="border rounded px-4 py-2 font-medium"
          >
            {saving ? "Saving…" : "Save Availability"}
          </button>
          {!anyAvailable && (
            <span className="text-xs opacity-70">
              Tip: mark at least one day to appear in “available subs” lists.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
