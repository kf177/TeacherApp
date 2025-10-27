"use client";
import { useState, useEffect } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

export default function NewJobPage() {
  const supabase = createClientBrowser();
  const [form, setForm] = useState({
    title: "",
    school: "",
    notes: "",
    start_date: "",
    end_date: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = "/login";
        return;
      }
    })();
  }, [supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to create a job.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("jobs").insert({
      title: form.title,
      school: form.school || null,
      notes: form.notes || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      created_by: user.id,
      status: "open", // <-- NEW
    });

    setBusy(false);

    if (error) {
      alert("Error creating job: " + error.message);
    } else {
      window.location.href = "/jobs";
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form
        onSubmit={onSubmit}
        className="max-w-md w-full border rounded-xl p-6 space-y-3"
      >
        <h1 className="text-2xl font-bold">Create New Job</h1>

        {/* Job Title */}
        <label className="block text-sm font-medium">Title</label>
        <input
          className="w-full border rounded p-2"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        {/* School */}
        <label className="block text-sm font-medium">School</label>
        <input
          className="w-full border rounded p-2"
          placeholder="School"
          value={form.school}
          onChange={(e) => setForm({ ...form, school: e.target.value })}
        />

        {/* Start Date */}
        <label className="block text-sm font-medium">Start Date</label>
        <input
          type="date"
          className="w-full border rounded p-2"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          required
        />

        {/* End Date */}
        <label className="block text-sm font-medium">End Date</label>
        <input
          type="date"
          className="w-full border rounded p-2"
          value={form.end_date}
          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          required
        />

        {/* Notes */}
        <label className="block text-sm font-medium">Notes</label>
        <textarea
          className="w-full border rounded p-2"
          placeholder="Notes (optional)"
          rows={4}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        <div className="flex items-center gap-3">
          <button
            disabled={busy}
            className="border rounded p-2 px-4 font-medium"
          >
            {busy ? "Creating…" : "Create Job"}
          </button>
          <a href="/jobs" className="underline">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
