// C:\Projects\TeacherApp\apps\web\src\app\teacher\page.tsx
"use client";

import Link from "next/link";
import RoleGate from "../RoleGate"; // from /app/teacher, go up one to /app
// import ProfileSync from "../ProfileSync"; // optional: keeps email/id synced

function TeacherInner() {
  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teacher — Home</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/teacher/dashboard" className="underline">Dashboard</Link>
          <Link href="/teacher/availability" className="underline">Availability</Link>
          <Link href="/teacher/profile" className="underline">Profile</Link>
        </nav>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/teacher/availability" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Set availability</h2>
          <p className="opacity-70 text-sm mt-1">
            Mark which days you’re available for the next two weeks.
          </p>
        </Link>

        <Link href="/teacher/profile" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Update profile</h2>
          <p className="opacity-70 text-sm mt-1">
            Name, phone, county, Teaching Council Number, and uploads.
          </p>
        </Link>
      </div>
    </div>
  );
}

export default function TeacherPage() {
  return (
    <RoleGate want="teacher" loginPath="/teacher/login" /* debug */>
      {/* <ProfileSync /> */}
      <TeacherInner />
    </RoleGate>
  );
}
