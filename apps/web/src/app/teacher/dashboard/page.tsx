"use client";
import RoleGate from "../../RoleGate";
import Link from "next/link";

function TeacherDashboardInner() {
  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/requests" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Requests for me</h2>
          <p className="opacity-70 text-sm mt-1">Accept or decline school invitations.</p>
        </Link>

        <Link href="/available-jobs" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">Available jobs</h2>
          <p className="opacity-70 text-sm mt-1">Browse open bookings.</p>
        </Link>

        <Link href="/my-jobs" className="block border rounded-xl p-6 hover:shadow-sm">
          <h2 className="font-semibold text-lg">My accepted jobs</h2>
          <p className="opacity-70 text-sm mt-1">See your assignments.</p>
        </Link>
      </div>
    </div>
  );
}

export default function TeacherDashboardPage() {
  return (
    <RoleGate want="sub" loginPath="/teacher/login">
      <TeacherDashboardInner />
    </RoleGate>
  );
}
