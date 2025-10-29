// C:\Projects\TeacherApp\apps\web\src\app\teacher\dashboard\page.tsx
"use client";

import RoleGate from "../../RoleGate";  // ✅ Correct path
import Link from "next/link";

function TeacherDashboardInner() {
  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <nav className="text-sm">
          <Link href="/teacher/profile" className="underline">
            Profile
          </Link>
        </nav>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/teacher/requests" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Requests for me</h2>
          <p className="opacity-70 text-sm mt-1">Accept or decline school invitations.</p>
        </Link>

        <Link href="/teacher/available-jobs" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Available jobs</h2>
          <p className="opacity-70 text-sm mt-1">Browse open bookings.</p>
        </Link>

        <Link href="/teacher/my-jobs" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">My accepted jobs</h2>
          <p className="opacity-70 text-sm mt-1">See your assignments.</p>
        </Link>

        <Link href="/teacher/settings" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Settings</h2>
          <p className="opacity-70 text-sm mt-1">Update availability and preferences.</p>
        </Link>
      </div>
    </div>
  );
}

export default function TeacherDashboardPage() {
  return (
    <RoleGate want="teacher" loginPath="/teacher/login" debug>
      <TeacherDashboardInner />
    </RoleGate>
  );
}
