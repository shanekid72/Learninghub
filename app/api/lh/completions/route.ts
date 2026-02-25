import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
    const base = process.env.LH_BASE_URL;
    const key = process.env.LH_API_KEY;
    if (!base || !key) return NextResponse.json({ ok: false, error: "missing_env" }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });

    const url = `${base}?action=completions&email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}`;
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
