// apps/web/src/app/principal/page.tsx
"use client";

import RoleGate from "../RoleGate";
import Link from "next/link";

function PrincipalInner() {
  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Principal — Home</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/dashboard" className="underline">
            Dashboard
          </Link>
          <Link href="/jobs" className="underline">
            My Jobs
          </Link>
          <Link href="/profile" className="underline">
            Profile
          </Link>
        </nav>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/jobs/new" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Make a booking</h2>
          <p className="opacity-70 text-sm mt-1">
            Create a new job and (optionally) invite a specific teacher.
          </p>
        </Link>

        <Link href="/principal/bookings" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">View bookings</h2>
          <p className="opacity-70 text-sm mt-1">
            See open, requested, and accepted bookings.
          </p>
        </Link>

        <Link href="/principal/bookings/past" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">View past bookings</h2>
          <p className="opacity-70 text-sm mt-1">Completed or past-dated bookings.</p>
        </Link>

        <Link href="/principal/teachers" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Browse teachers</h2>
          <p className="opacity-70 text-sm mt-1">
            View teachers and start a booking with one.
          </p>
        </Link>
      </div>
    </div>
  );
}

export default function PrincipalPage() {
  return (
    <RoleGate want="principal" loginPath="/principal/login" debug>
      <PrincipalInner />
    </RoleGate>
  );
}
