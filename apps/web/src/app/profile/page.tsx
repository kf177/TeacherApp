"use client";
import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const supabase = createClientBrowser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: "", avatar_url: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = "/login";
        return;
      }

      const userId = session.session.user.id;

      // Fetch (or create) profile
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
        setForm({
          full_name: data.full_name ?? "",
          avatar_url: data.avatar_url ?? "",
        });
      } else {
        // ensure row exists via upsert (safety)
        await supabase
          .from("profiles")
          .upsert({ id: userId, email: session.session.user.email ?? null });
        setProfile({
          id: userId,
          email: session.session.user.email ?? null,
          full_name: "",
          avatar_url: "",
        });
      }
    })();
  }, [supabase]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        avatar_url: form.avatar_url || null,
      })
      .eq("id", profile.id);

    setBusy(false);

    if (error) return alert("Save failed: " + error.message);
    alert("Profile saved ✅");
    // Optional: navigate somewhere
    // window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSave} className="max-w-md w-full border rounded-xl p-6 space-y-3">
        <h1 className="text-2xl font-bold">Edit Profile</h1>

        <div className="text-sm opacity-80">
          Signed in as: <span className="font-medium">{profile?.email}</span>
        </div>

        <label className="block text-sm font-medium">Full name</label>
        <input
          className="w-full border rounded p-2"
          placeholder="Jane Doe"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />

        <label className="block text-sm font-medium">Avatar URL (optional)</label>
        <input
          className="w-full border rounded p-2"
          placeholder="https://…"
          value={form.avatar_url}
          onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
        />

        <div className="flex items-center gap-3">
          <button disabled={busy} className="border rounded p-2 px-4 font-medium">
            {busy ? "Saving…" : "Save"}
          </button>
          <a href="/dashboard" className="underline">Cancel</a>
        </div>
      </form>
    </div>
  );
}
