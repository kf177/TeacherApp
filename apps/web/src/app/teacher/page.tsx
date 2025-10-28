"use client";
import Link from "next/link";
import RoleGate from "../RoleGate";
import { createClientBrowser } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function TeacherHomePage() {
  return (
    <RoleGate want="sub" loginPath="/teacher/login">
      <TeacherDashboard />
    </RoleGate>
  );
}

function TeacherDashboard() {
  const supabase = createClientBrowser();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setEmail(data.user.email ?? null);
    })();
  }, [supabase]);

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          {email && <p className="text-sm opacity-70">Signed in as {email}</p>}
        </div>
        <a href="/" className="underline text-sm opacity-70 hover:opacity-100">
          ← Back to Home
        </a>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Availability */}
        <Link
          href="/teacher/availability"
          className="block border rounded-xl p-6 hover:shadow-sm hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold text-lg">Set Availability</h2>
          <p className="opacity-70 text-sm mt-1">
            Choose which weekdays you’re available starting from a given date.
          </p>
        </Link>

        {/* View Bookings */}
        <Link
          href="/teacher/bookings"
          className="block border rounded-xl p-6 hover:shadow-sm hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold text-lg">View Bookings</h2>
          <p className="opacity-70 text-sm mt-1">
            Check and manage bookings you’ve accepted.
          </p>
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className="block border rounded-xl p-6 hover:shadow-sm hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold text-lg">My Profile</h2>
          <p className="opacity-70 text-sm mt-1">
            Update your name, email, and avatar.
          </p>
        </Link>

        {/* Logout */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="block border rounded-xl p-6 text-left hover:shadow-sm hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold text-lg">Logout</h2>
          <p className="opacity-70 text-sm mt-1">
            Sign out and return to the home screen.
          </p>
        </button>
      </div>
    </div>
  );
}
