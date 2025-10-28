"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientBrowser } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export default function PrincipalSubs() {
  const supabase = createClientBrowser();
  const [me, setMe] = useState<string | null>(null);
  const [subs, setSubs] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) { window.location.href = "/login"; return; }
      setMe(userId);

      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name");

      if (!error && data) {
        const list = (data as Profile[]).filter(p => p.id !== userId);
        setSubs(list);
      }
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) return <div className="min-h-screen grid place-items-center p-6">Loading…</div>;

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Substitutes</h1>
        <Link href="/principal" className="underline text-sm">← Principal Home</Link>
      </div>

      {subs.length === 0 ? (
        <p className="opacity-70">No other users found yet.</p>
      ) : (
        <ul className="grid gap-3">
          {subs.map(s => (
            <li key={s.id} className="border rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{s.full_name ?? "Unnamed User"}</div>
                <div className="text-sm opacity-80">{s.email ?? s.id}</div>
              </div>
              <Link
                href={`/jobs/new?subId=${s.id}`}
                className="border rounded px-3 py-2 text-sm font-medium hover:shadow-sm"
              >
                Start booking
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
