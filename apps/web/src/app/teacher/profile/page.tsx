// File: apps/web/src/app/teacher/profile/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "../../RoleGate";
import { createClientBrowser } from "@/lib/supabaseClient";

// --- Types ---
interface TeacherProfile {
  id: string; // user id
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;              // public/signed URL to avatar
  phone_number: string | null;
  county: string | null;                  // one of 26 ROI counties
  teaching_council_number: string | null; // teacher's TCN
  qualifications_url: string | null;      // URL to qualifications file (pdf/image)
}

// --- Constants ---
const IRISH_26_COUNTIES = [
  "Carlow","Cavan","Clare","Cork","Donegal","Dublin","Galway","Kerry",
  "Kildare","Kilkenny","Laois","Leitrim","Limerick","Longford","Louth",
  "Mayo","Meath","Monaghan","Offaly","Roscommon","Sligo","Tipperary",
  "Waterford","Westmeath","Wexford","Wicklow"
] as const;

const AVATARS_BUCKET = "avatars";               // create in Supabase Storage
const QUALIFICATIONS_BUCKET = "qualifications";  // create in Supabase Storage

export default function TeacherProfilePage() {
  return (
    <RoleGate want="teacher" loginPath="/teacher/login">
      <TeacherProfileInner />
    </RoleGate>
  );
}

function TeacherProfileInner() {
  const supabase = createClientBrowser();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    county: "",
    teaching_council_number: "",
    avatar_url: "",
    qualifications_url: "",
  });

  // Basic validators (client-side convenience only)
  const validators = useMemo(() => {
    const phoneRe = /^(?:\+353\s?|\(0\)\s?|0)(?:[1-9]\d{0,1})\s?\d{3}\s?\d{4}$/;
    const tcnRe = /^[A-Za-z0-9\-]{5,20}$/; // very light check; tighten if you have exact format

    return {
      phone_number: (v: string) => !v || phoneRe.test(v.trim()) ? "" : "Enter a valid Irish phone number",
      county: (v: string) => !v || (IRISH_26_COUNTIES as readonly string[]).includes(v) ? "" : "Select a valid county",
      teaching_council_number: (v: string) => !v || tcnRe.test(v.trim()) ? "" : "Enter a valid TCN",
    } as const;
  }, []);

  // Load or bootstrap teacher profile
  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) {
        window.location.href = "/teacher/login";
        return;
      }

      // Read from the same `profiles` table you already use
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,avatar_url,phone_number,county,teaching_council_number,qualifications_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
      }

      if (!data) {
        // ensure row exists with id/email
        await supabase.from("profiles").upsert({ id: user.id, email: user.email });
        setProfile({
          id: user.id,
          email: user.email ?? null,
          full_name: null,
          avatar_url: null,
          phone_number: null,
          county: null,
          teaching_council_number: null,
          qualifications_url: null,
        });
      } else {
        const p = data as TeacherProfile;
        setProfile(p);
        setForm({
          full_name: p.full_name ?? "",
          phone_number: p.phone_number ?? "",
          county: p.county ?? "",
          teaching_council_number: p.teaching_council_number ?? "",
          avatar_url: p.avatar_url ?? "",
          qualifications_url: p.qualifications_url ?? "",
        });
      }
    })();
  }, [supabase]);

  // Helpers
  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (key in validators) {
      const msg = (validators as any)[key](value);
      setErrors((errs) => ({ ...errs, [key]: msg }));
    }
  };

  async function uploadToBucket(bucket: string, file: File): Promise<string | null> {
    const { data: session } = await supabase.auth.getSession();
    const user = session.session?.user;
    if (!user) return null;

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      alert(`Upload failed: ${upErr.message}`);
      return null;
    }

    // If bucket is public, this is a fast way to grab a public URL.
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return pub.publicUrl;
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadToBucket(AVATARS_BUCKET, file);
    if (url) setForm((f) => ({ ...f, avatar_url: url }));
  }

  async function onQualsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadToBucket(QUALIFICATIONS_BUCKET, file);
    if (url) setForm((f) => ({ ...f, qualifications_url: url }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    // final validation
    const nextErrors: Record<string, string> = {};
    (Object.keys(validators) as (keyof typeof validators)[]).forEach((k) => {
      const msg = validators[k]((form as any)[k]);
      if (msg) nextErrors[k as string] = msg;
    });
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      alert("Please fix the highlighted fields.");
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        avatar_url: form.avatar_url || null,
        phone_number: form.phone_number || null,
        county: form.county || null,
        teaching_council_number: form.teaching_council_number || null,
        qualifications_url: form.qualifications_url || null,
      })
      .eq("id", profile.id);
    setBusy(false);

    if (error) {
      alert("Save failed: " + error.message);
    } else {
      alert("Profile saved ✅");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSave} className="max-w-2xl w-full border rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <a href="/teacher" className="underline text-sm">← Back</a>
        </div>

        <div className="text-sm opacity-80">
          Signed in as: <span className="font-medium">{profile?.email}</span>
        </div>

        {/* Avatar */}
        <div className="grid sm:grid-cols-[112px_1fr] gap-4 items-start">
          <div className="w-24 h-24 rounded-full overflow-hidden border bg-gray-50">
            {form.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-xs opacity-60">No photo</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Profile Picture</label>
            <div className="flex gap-3 items-center">
              <input type="file" accept="image/*" onChange={onAvatarChange} />
              {form.avatar_url && (
                <a href={form.avatar_url} target="_blank" className="underline text-sm">View</a>
              )}
            </div>
            <p className="text-xs opacity-70 mt-1">Upload a square image (JPG/PNG/WebP).</p>
          </div>
        </div>

        {/* Text fields */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input className="w-full border rounded p-2" value={form.full_name} onChange={setField("full_name")} />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input className="w-full border rounded p-2 bg-gray-50" value={profile?.email ?? ""} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input className="w-full border rounded p-2" placeholder="+353 1 234 5678" value={form.phone_number} onChange={setField("phone_number")} />
            {errors.phone_number && <p className="text-xs text-red-600 mt-1">{errors.phone_number}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">County</label>
            <select className="w-full border rounded p-2 bg-white" value={form.county} onChange={setField("county")}> 
              <option value="">Select county…</option>
              {IRISH_26_COUNTIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.county && <p className="text-xs text-red-600 mt-1">{errors.county}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Teaching Council Number</label>
            <input className="w-full border rounded p-2" value={form.teaching_council_number} onChange={setField("teaching_council_number")} />
            {errors.teaching_council_number && (
              <p className="text-xs text-red-600 mt-1">{errors.teaching_council_number}</p>
            )}
          </div>
        </div>

        {/* Qualifications upload */}
        <div>
          <label className="block text-sm font-medium mb-1">Qualifications</label>
          <div className="flex items-center gap-3">
            <input type="file" accept="application/pdf,image/*" onChange={onQualsChange} />
            {form.qualifications_url && (
              <a href={form.qualifications_url} target="_blank" className="underline text-sm">View file</a>
            )}
          </div>
          <p className="text-xs opacity-70 mt-1">Upload a PDF or image of your qualifications.</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button disabled={busy} className="border rounded p-2 px-4 font-medium disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
          <a href="/teacher" className="underline">Cancel</a>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// SQL: Add columns to `profiles` if they don't exist yet
// Run in Supabase SQL editor
/*
alter table profiles
  add column if not exists teaching_council_number text,
  add column if not exists qualifications_url text;
*/

// -------------------------------------------------------------
// Storage: create buckets (public read is simplest)
/*
-- In the Dashboard > Storage, create two buckets:
-- 1) avatars (public)
-- 2) qualifications (public)

-- If you prefer private buckets, keep them private and instead of getPublicUrl
-- generate signed URLs on display. For a quick start, public is fine.
*/

// -------------------------------------------------------------
// Optional: storage policies to allow only the owner to upload
/*
-- Avatars
create policy if not exists "avatars insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Qualifications
create policy if not exists "quals insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'qualifications' and auth.uid()::text = (storage.foldername(name))[1]
  );
*/

// -------------------------------------------------------------
// RLS (ensure only the user can read/update their row)
/*
-- Table: profiles (RLS ON)
create policy if not exists "profiles select own" on profiles for select to authenticated using (id = auth.uid());
create policy if not exists "profiles update own" on profiles for update to authenticated using (id = auth.uid());
*/
