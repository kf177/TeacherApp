// File: apps/web/src/app/api/notify-job-request/route.ts
// cspell:words supabase Resend

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Server-side Supabase client (service role key ONLY on server)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: format date range nicely
function prettyDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "";
  if (start && (!end || start === end)) return start;
  return `${start} → ${end}`;
}

export async function POST(req: NextRequest) {
  try {
    // --- Fast env checks ---
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: false, error: "RESEND_API_KEY missing" }, { status: 500 });
    }
    if (!process.env.MAIL_FROM) {
      return NextResponse.json({ ok: false, error: "MAIL_FROM missing" }, { status: 500 });
    }

    const body = await req.json();
    const { teacherId, job } = body ?? {};
    if (!teacherId || !job?.id) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    // --- Auth: header OR cookie (sb-access-token) ---
    const authHeader = req.headers.get("authorization");
    let token: string | undefined =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    if (!token) {
      const jar = await cookies();
      const cookieToken = jar.get("sb-access-token")?.value;
      token = cookieToken || token;
    }
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Who is calling?
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    // --- Authorization: caller must own the job
    const { data: jobRow, error: jobErr } = await supabase
      .from("jobs")
      .select("id, created_by, school, start_date, end_date")
      .eq("id", job.id)
      .single();

    if (jobErr || !jobRow) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }
    if (jobRow.created_by !== user.id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // --- Look up the teacher's email using Admin API (service role)
    const { data: teacherUser, error: adminErr } = await supabase.auth.admin.getUserById(teacherId);
    if (adminErr || !teacherUser?.user?.email) {
      return NextResponse.json({ ok: false, error: "Teacher email not found" }, { status: 400 });
    }
    const teacherEmail = teacherUser.user.email;

    // --- Send the email via Resend ---
    const from = process.env.MAIL_FROM!;
    const appOrigin = process.env.APP_ORIGIN || "http://localhost:3000";
    const reviewLink = `${appOrigin}/teacher/requests`;
    const dateText = prettyDateRange(jobRow.start_date, jobRow.end_date);

    await resend.emails.send({
      from,
      to: teacherEmail,
      subject: "New booking request",
      html: `
        <p>Hi there,</p>
        <p>You’ve been requested for <strong>${jobRow.school ?? "your school"}</strong> on <strong>${dateText}</strong>.</p>
        <p>Please <a href="${reviewLink}">review and respond</a> in your account.</p>
        <p>Thank you,<br/>TeacherApp</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("notify-job-request error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
