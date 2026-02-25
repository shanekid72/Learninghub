import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const base = process.env.LH_BASE_URL;
    const key = process.env.LH_API_KEY;
    if (!base || !key) return NextResponse.json({ ok: false, error: "missing_env" }, { status: 500 });

    const body = await req.json();
    const url = `${base}?action=markComplete&key=${encodeURIComponent(key)}`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

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
