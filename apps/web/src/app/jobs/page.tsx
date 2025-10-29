"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";

type Profile = { id: string; full_name: string | null; email: string | null };

export default function NewJobPage() {
  const supabase = createClientBrowser();
  const searchParams = useSearchParams();

  // Read ?subId= from URL (e.g., from Principal → Substitutes → Start booking)
  const preSelectedSub = searchParams.get("subId") ?? "";

  const [meId, setMeId] = useState<string | null>(null);
  const [subs, setSubs] = useState<Profile[]>([]);
  const [subsQuery, setSubsQuery] = useState("");

  const [loadingSubs, setLoadingSubs] = useState(true);
  const [subsError, setSubsError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    school: "",
    notes: "",
    start_date: "",
    end_date: "",
    requested_sub: preSelectedSub,
  });

  // Keep requested_sub in sync if ?subId changes and nothing selected yet
  useEffect(() => {
    if (preSelectedSub && !form.requested_sub) {
      setForm((f) => ({ ...f, requested_sub: preSelectedSub }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSelectedSub]);

  // Load substitutes (all profiles except the current user)
  useEffect(() => {
    (async () => {
      setLoadingSubs(true);
      setSubsError(null);

      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setMeId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .neq("id", user.id) // exclude myself at the DB level
        .order("full_name", { ascending: true, nullsFirst: true })
        .order("email", { ascending: true, nullsFirst: true });

      if (error) {
        console.error("profiles select error:", error);
        setSubsError(error.message);
        setSubs([]);
      } else {
        setSubs((data ?? []) as Profile[]);
      }

      setLoadingSubs(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSubs = useMemo(() => {
    const q = subsQuery.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter((s) => {
      const name = (s.full_name ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [subs, subsQuery]);

  const selectSub = (p: Profile) => {
    setForm((f) => ({ ...f, requested_sub: p.id }));
  };

  const clearSub = () => {
    setForm((f) => ({ ...f, requested_sub: "" }));
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

    const willRequest = !!form.requested_sub;

    const { error } = await supabase.from("jobs").insert({
      title: form.title,
      school: form.school || null,
      notes: form.notes || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      created_by: user.id,
      requested_sub: form.requested_sub || null,
      status: willRequest ? "requested" : "open",
    });

    setBusy(false);

    if (error) {
      alert("Error creating booking: " + error.message);
    } else {
      window.location.href = "/principal/bookings";
    }
  };

  const SelectedSubBadge = () => {
    if (!form.requested_sub) return null;
    const who = subs.find((s) => s.id === form.requested_sub);
    if (!who) return null;
    return (
      <div className="flex items-center justify-between rounded-lg border p-2 text-sm">
        <div>
          <div className="font-medium">{who.full_name ?? "Unnamed User"}</div>
          <div className="opacity-80">{who.email ?? who.id}</div>
        </div>
        <button
          type="button"
          className="underline ml-3"
          onClick={clearSub}
          title="Remove selected sub"
        >
          Clear
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create New Booking</h1>

      {/* Two-column layout on desktop, stacked on mobile */}
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
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">End Date</label>
                <input
                  type="date"
                  className="w-full border rounded p-2"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
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
              <div className="text-sm font-medium">
                Selected substitute (optional)
              </div>
              <SelectedSubBadge />
              {!form.requested_sub && (
                <p className="text-xs opacity-70">
                  If none selected, the booking will be posted as <b>open</b>.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={busy}
                className="border rounded p-2 px-4 font-medium"
              >
                {busy ? "Creating…" : "Create Booking"}
              </button>
              <a href="/principal" className="underline">
                Cancel
              </a>
            </div>
          </form>
        </div>

        {/* Right: Sub list / selector */}
        <aside className="md:col-span-1 border rounded-xl p-4 h-fit">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Substitutes</h2>
            <div className="text-xs opacity-70">
              {loadingSubs ? "Loading…" : subsError ? "Error" : null}
            </div>
          </div>

          {subsError && (
            <div className="text-xs text-red-600 mb-2 break-words">
              Failed to load subs: {subsError}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <input
              className="w-full border rounded p-2"
              placeholder="Search name or email…"
              value={subsQuery}
              onChange={(e) => setSubsQuery(e.target.value)}
              disabled={loadingSubs}
            />
            <a href="/principal/subs" className="underline text-xs">
              View all
            </a>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {loadingSubs ? (
              <div className="text-sm opacity-70">Loading substitutes…</div>
            ) : filteredSubs.length === 0 ? (
              <div className="text-sm opacity-70">No matching substitutes.</div>
            ) : (
              filteredSubs.map((s) => {
                const isSelected = form.requested_sub === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectSub(s)}
                    className={`w-full text-left border rounded-lg p-2 ${
                      isSelected ? "ring-2 ring-blue-500" : "hover:bg-gray-50"
                    }`}
                    title="Pick this substitute"
                  >
                    <div className="font-medium text-sm">
                      {s.full_name ?? "Unnamed User"}
                    </div>
                    <div className="text-xs opacity-80">{s.email ?? s.id}</div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
