import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/app-session";
import { createAdminClient } from "@/lib/supabase/server";
import { buildModuleAssignmentMap } from "@/lib/module-assignments";
import type { AssignmentRecord } from "@/lib/module-assignments";

export const runtime = "nodejs";

type UpstreamModule = {
    id: number | string;
    content_embed_url?: string;
    due_date?: string | null;
    assigned?: boolean;
} & Record<string, unknown>;

export async function GET() {
    const session = await getSessionContext();
    if (!session) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

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
    const assignmentMap = new Map<string, { assigned: true; dueDate?: string }>();

    if (session.profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = await createAdminClient();

        const { data: userAssignments, error: userAssignmentsError } = await supabase
            .from("module_assignments")
            .select("module_id, due_date")
            .eq("module_source", "lh")
            .eq("is_active", true)
            .eq("user_id", session.profile.id);

        if (userAssignmentsError) {
            throw userAssignmentsError;
        }

        let teamAssignments: AssignmentRecord[] = [];
        if (session.profile.team) {
            const { data, error } = await supabase
                .from("module_assignments")
                .select("module_id, due_date")
                .eq("module_source", "lh")
                .eq("is_active", true)
                .eq("team", session.profile.team);

            if (error) {
                throw error;
            }
            teamAssignments = data || [];
        }

        const mergedAssignments: AssignmentRecord[] = [
            ...(userAssignments || []),
            ...teamAssignments,
        ];
        const built = buildModuleAssignmentMap(mergedAssignments);
        for (const [moduleId, meta] of built.entries()) {
            assignmentMap.set(moduleId, meta);
        }
    }

    // Optional: hide any broken placeholder rows if they exist
    if (Array.isArray(data?.modules) && data.modules.length > 0) {
        const cleanedModules = (data.modules as UpstreamModule[]).filter(
            (module) =>
                !String(module.content_embed_url || "").includes("FILE_ID"),
        );

        data.modules = cleanedModules.map((module) => {
            const assignment = assignmentMap.get(String(module.id));
            return {
                ...module,
                assigned: Boolean(assignment),
                due_date: assignment?.dueDate ?? module.due_date ?? null,
            };
        });
    }

    return NextResponse.json(data);
}
