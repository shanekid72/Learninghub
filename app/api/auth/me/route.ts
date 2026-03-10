import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/app-session";

export async function GET() {
  const session = await getSessionContext();

  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    email: session.email,
    user: session.profile,
  });
}
