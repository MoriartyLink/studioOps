import { NextRequest, NextResponse } from "next/server";
import { isLocalLoginEnabled, localSessionValue, validateLocalLogin } from "@/lib/local-auth";

export async function POST(request: NextRequest) {
  if (!isLocalLoginEnabled()) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const profile = body?.email && body.password ? validateLocalLogin(body.email, body.password) : null;
  if (!profile) return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
  const response = NextResponse.json({ profile });
  response.cookies.set("studioops_local_session", localSessionValue(profile.role), { httpOnly: true, sameSite: "lax", path: "/", secure: false, maxAge: 60 * 60 * 12 });
  return response;
}
