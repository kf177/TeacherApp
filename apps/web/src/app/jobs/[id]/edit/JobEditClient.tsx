"use client";
import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  school: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
};

export default function JobEditClient({ id }: { id: string }) {
  const supabase = createClientBrowser();
  const [job, setJob] = useState<Job | null>(null);
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

      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,school,notes,start_date,end_date")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        alert(error?.message ?? "Job not found");
        return;
      }

      setJob(data as Job);
      setForm({
        title: data.title ?? "",
        school: data.school ?? "",
        notes: data.notes ?? "",
        start_date: data.start_date ?? "",
        end_date: data.end_date ?? "",
      });
    })();
  }, [id, supabase]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setBusy(true);

    const { data, error } = await supabase
      .from("jobs")
      .update({
        title: form.title,
        school: form.school || null,
        notes: form.notes || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      })
      .eq("id", job.id)
      .select("*")
      .limit(1);

    setBusy(false);

    if (error) {
      alert("Update failed: " + error.message);
      return;
    }

    const updated = Array.isArray(data) ? data[0] : data;
    if (!updated) {
      alert("No row returned after update (check RLS policy and created_by).");
      return;
    }

    window.location.href = `/jobs?r=${Date.now()}`;
  };

  if (!job) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="opacity-70">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form
        onSubmit={onSave}
        className="max-w-md w-full border rounded-xl p-6 space-y-3"
      >
        <h1 className="text-2xl font-bold">Edit Job</h1>

        {/* Title */}
        <label className="block text-sm font-medium">Title</label>
        <input
          className="w-full border rounded p-2"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        {/* School */}
        <label className="block text-sm font-medium">School</label>
        <input
          className="w-full border rounded p-2"
          value={form.school}
          onChange={(e) => setForm({ ...form, school: e.target.value })}
        />

        {/* Start Date */}
        <label className="block text-sm font-medium">Start Date</label>
        <input
          type="date"
          className="w-full border rounded p-2"
          value={form.start_date || ""}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          required
        />

        {/* End Date */}
        <label className="block text-sm font-medium">End Date</label>
        <input
          type="date"
          className="w-full border rounded p-2"
          value={form.end_date || ""}
          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          required
        />

        {/* Notes */}
        <label className="block text-sm font-medium">Notes</label>
        <textarea
          className="w-full border rounded p-2"
          rows={4}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        <div className="flex items-center gap-3">
          <button
            disabled={busy}
            className="border rounded p-2 px-4 font-medium"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
          <a href={`/jobs/${job.id}`} className="underline">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
