import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthCookieName, readEmailFromSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET(req: Request) {
    const cookieStore = await cookies();
    const authEmail = await readEmailFromSession(
        cookieStore.get(getAuthCookieName())?.value,
    );
    if (!authEmail) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const base = process.env.LH_BASE_URL;
    const key = process.env.LH_API_KEY;
    if (!base || !key) return NextResponse.json({ ok: false, error: "missing_env" }, { status: 500 });

    // Compatibility bridge: keep accepting query param but trust session identity only.
    const { searchParams } = new URL(req.url);
    const _compatEmail = searchParams.get("email");

    const url = `${base}?action=completions&email=${encodeURIComponent(authEmail)}&key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { cache: "no-store" });

    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        return NextResponse.json(
            { ok: false, error: "upstream_not_json", status: res.status, contentType, snippet: text.slice(0, 200) },
            { status: 500 }
        );
    }

    return NextResponse.json(JSON.parse(text));
}
