import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    const base = process.env.LH_BASE_URL;
    const key = process.env.LH_API_KEY;

    if (!base || !key) {
        return NextResponse.json(
            { ok: false, error: "missing_env" },
            { status: 500 },
        );
    }

    const url = `${base}?action=modules&key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { cache: "no-store" });

    // Safer than res.json() (protects you if Google ever returns HTML)
    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        return NextResponse.json(
            {
                ok: false,
                error: "upstream_not_json",
                status: res.status,
                contentType,
                snippet: text.slice(0, 200),
            },
            { status: 500 },
        );
    }

    const data = JSON.parse(text);

    // Optional: hide any broken placeholder rows if they exist
    if (data?.modules?.length) {
        data.modules = data.modules.filter(
            (m: any) => !String(m.content_embed_url || "").includes("FILE_ID"),
        );
    }

    return NextResponse.json(data);
}
