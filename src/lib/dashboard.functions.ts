import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TOTAL_PE_UNIVERSE = 91;

export type DashboardData = {
  role: "recruiter" | "client";
  searchInitiated: string | null;
  daysActive: number;
  candidatesInPipeline: number;
  funnel: { stage: string; count: number }[];
  geography: { bucket: string; count: number }[];
  irFunctions: { name: string; count: number }[];
  peCoverage: { sourced: number; total: number };
  activity: { id: string; created_at: string; user_name: string | null; description: string }[];
};

const STAGE_ORDER = [
  "Sourced",
  "Contacted",
  "Engaged",
  "Screening",
  "Client Interview",
  "Offer",
  "Placed",
] as const;

const ACTIVE_EXCLUDE = new Set(["Placed", "Declined", "Passed"]);

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    const { supabase, userId } = context;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    const role = (roleRow?.role as "recruiter" | "client") ?? "client";

    // Candidates: RLS already filters client to client_visible only
    const { data: candidates } = await supabase
      .from("candidates")
      .select("id, created_at, pipeline_stage, location_bucket, ir_functions");

    const list = candidates ?? [];

    const searchInitiated =
      list.length > 0
        ? list.reduce((min, c) => (c.created_at < min ? c.created_at : min), list[0].created_at)
        : null;

    const daysActive = searchInitiated
      ? Math.max(0, Math.floor((Date.now() - new Date(searchInitiated).getTime()) / 86400000))
      : 0;

    const candidatesInPipeline = list.filter((c) => !ACTIVE_EXCLUDE.has(c.pipeline_stage as string)).length;

    const funnel = STAGE_ORDER.map((stage) => ({
      stage,
      count: list.filter((c) => c.pipeline_stage === stage).length,
    }));

    const geoBuckets = ["Florida", "Texas", "Tri-State", "Other US", "International"];
    const geography = geoBuckets.map((b) => ({
      bucket: b,
      count: list.filter((c) => c.location_bucket === b).length,
    }));

    const irBuckets = ["Capital Raising", "LP Relations", "Reporting & Analytics", "Marketing & Comms", "Strategy"];
    const irFunctions = irBuckets.map((name) => ({
      name,
      count: list.filter((c) => Array.isArray(c.ir_functions) && c.ir_functions.includes(name as never)).length,
    }));

    let peCoverage = { sourced: 0, total: TOTAL_PE_UNIVERSE };
    let activity: DashboardData["activity"] = [];

    if (role === "recruiter") {
      const { count } = await supabase
        .from("pe_firms")
        .select("*", { count: "exact", head: true })
        .in("status", ["Contacted", "Sourced From"]);
      peCoverage = { sourced: count ?? 0, total: TOTAL_PE_UNIVERSE };

      const { data: log } = await supabase
        .from("activity_log")
        .select("id, created_at, action, payload, user_id")
        .order("created_at", { ascending: false })
        .limit(10);

      const userIds = Array.from(new Set((log ?? []).map((l) => l.user_id).filter(Boolean) as string[]));
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : { data: [] as { id: string; full_name: string | null; email: string }[] };
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));

      activity = (log ?? []).map((row) => {
        const p = (row.payload ?? {}) as { name?: string; from?: string; to?: string; stage?: string };
        let description = row.action;
        if (row.action === "stage_change" && p.name) {
          description = `${p.name} moved from ${p.from} to ${p.to}`;
        } else if (row.action === "candidate_created" && p.name) {
          description = `${p.name} added to pipeline`;
        }
        return {
          id: row.id,
          created_at: row.created_at,
          user_name: row.user_id ? nameMap.get(row.user_id) ?? null : null,
          description,
        };
      });
    }

    return {
      role,
      searchInitiated,
      daysActive,
      candidatesInPipeline,
      funnel,
      geography,
      irFunctions,
      peCoverage,
      activity,
    };
  });
