// C:\Projects\TeacherApp\apps\web\src\app\profile\page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  school_name: string | null;
  school_address: string | null;
  county: string | null;
  eircode: string | null;
  principal: string | null;
  phone_number: string | null;
};

const IRISH_COUNTIES = [
  "Antrim","Armagh","Carlow","Cavan","Clare","Cork","Derry","Donegal","Down",
  "Dublin","Fermanagh","Galway","Kerry","Kildare","Kilkenny","Laois","Leitrim",
  "Limerick","Longford","Louth","Mayo","Meath","Monaghan","Offaly","Roscommon",
  "Sligo","Tipperary","Tyrone","Waterford","Westmeath","Wexford","Wicklow"
] as const;

export default function ProfilePage() {
  const supabase = createClientBrowser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    full_name: "",
    avatar_url: "",
    school_name: "",
    school_address: "",
    county: "",
    eircode: "",
    principal: "",
    phone_number: "",
  });

  // Basic validators (client-side convenience only)
  const validators = useMemo(() => {
    // Eircode: routing key (3) + optional space + unique identifier (4)
    const eircodeRe = /^[AC-FHKNPRTV-Y0-9]{3}\s?[0-9AC-FHKNPRTV-Y]{4}$/i;
    // Very light Irish phone check; you can harden this if needed
    const phoneRe =
      /^(?:\+353\s?|\(0\)\s?|0)(?:[1-9]\d{0,1})\s?\d{3}\s?\d{4}$/;

    return {
      eircode: (v: string) =>
        !v || eircodeRe.test(v.trim()) ? "" : "Enter a valid Eircode (e.g., D02 Y006)",
      phone_number: (v: string) =>
        !v || phoneRe.test(v.trim()) ? "" : "Enter a valid Irish phone number",
      county: (v: string) =>
        !v || IRISH_COUNTIES.includes(v as any) ? "" : "Select a valid county",
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = "/login";
        return;
      }

      const userId = session.session.user.id;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,email,full_name,avatar_url,school_name,school_address,county,eircode,principal,phone_number"
        )
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        const p = data as Profile;
        setProfile(p);
        setForm({
          full_name: p.full_name ?? "",
          avatar_url: p.avatar_url ?? "",
          school_name: p.school_name ?? "",
          school_address: p.school_address ?? "",
          county: p.county ?? "",
          eircode: p.eircode ?? "",
          principal: p.principal ?? "",
          phone_number: p.phone_number ?? "",
        });
      } else {
        await supabase
          .from("profiles")
          .upsert({ id: userId, email: session.session.user.email ?? null });
        setProfile({
          id: userId,
          email: session.session.user.email ?? null,
          full_name: "",
          avatar_url: "",
          school_name: "",
          school_address: "",
          county: "",
          eircode: "",
          principal: "",
          phone_number: "",
        });
      }
    })();
  }, [supabase]);

  const setField =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      // live-validate core fields
      if (key in validators) {
        const msg = (validators as any)[key](e.target.value);
        setErrors((errs) => ({ ...errs, [key as string]: msg }));
      }
    };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // final validation
    const nextErrors: Record<string, string> = {};
    (["eircode", "phone_number", "county"] as const).forEach((k) => {
      const msg = (validators as any)[k](form[k]);
      if (msg) nextErrors[k] = msg;
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
        school_name: form.school_name || null,
        school_address: form.school_address || null,
        county: form.county || null,
        eircode: form.eircode ? form.eircode.toUpperCase().replace(/\s+/g, "") : null,
        principal: form.principal || null,
        phone_number: form.phone_number || null,
      })
      .eq("id", profile.id);

    setBusy(false);

    if (error) return alert("Save failed: " + error.message);
    alert("Profile saved ✅");
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSave} className="max-w-2xl w-full border rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <a href="/dashboard" className="underline text-sm">Back to Dashboard</a>
        </div>

        <div className="text-sm opacity-80">
          Signed in as: <span className="font-medium">{profile?.email}</span>
        </div>

        {/* Personal */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Full name</label>
            <input
              className="w-full border rounded p-2"
              placeholder="Jane Doe"
              value={form.full_name}
              onChange={setField("full_name")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Avatar URL (optional)</label>
            <input
              className="w-full border rounded p-2"
              placeholder="https://…"
              value={form.avatar_url}
              onChange={setField("avatar_url")}
            />
          </div>
        </div>

        <hr className="my-2" />

        {/* School */}
        <h2 className="text-lg font-semibold">School details</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">School Name</label>
            <input
              className="w-full border rounded p-2"
              placeholder="St. Example National School"
              value={form.school_name}
              onChange={setField("school_name")}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">School Address</label>
            <textarea
              className="w-full border rounded p-2 min-h-[96px]"
              placeholder={"Line 1\nLine 2\nTown"}
              value={form.school_address}
              onChange={setField("school_address")}
            />
            <p className="text-xs opacity-70 mt-1">Use multiple lines for formatting; we’ll store it as entered.</p>
          </div>

          <div>
            <label className="block text-sm font-medium">County</label>
            <select
              className="w-full border rounded p-2 bg-white"
              value={form.county}
              onChange={setField("county")}
            >
              <option value="">Select county…</option>
              {IRISH_COUNTIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.county && <p className="text-xs text-red-600 mt-1">{errors.county}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium">Eircode</label>
            <input
              className="w-full border rounded p-2 uppercase tracking-wide"
              placeholder="D02 Y006"
              value={form.eircode}
              onChange={setField("eircode")}
            />
            {errors.eircode && <p className="text-xs text-red-600 mt-1">{errors.eircode}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium">Principal</label>
            <input
              className="w-full border rounded p-2"
              placeholder="Name of principal"
              value={form.principal}
              onChange={setField("principal")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Phone Number</label>
            <input
              className="w-full border rounded p-2"
              placeholder="+353 1 234 5678"
              value={form.phone_number}
              onChange={setField("phone_number")}
            />
            {errors.phone_number && (
              <p className="text-xs text-red-600 mt-1">{errors.phone_number}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            disabled={busy}
            className="border rounded p-2 px-4 font-medium disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <a href="/dashboard" className="underline">Cancel</a>
        </div>
      </form>
    </div>
  );
}
