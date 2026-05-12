import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PIPELINE_STAGES, REJECTED_STAGES, IR_FUNCTIONS } from "@/lib/csv-schemas";

export const TOTAL_PE_UNIVERSE = 91;

export type DashboardData = {
  role: "recruiter" | "client";
  searchInitiated: string | null;
  daysActive: number;
  candidatesInPipeline: number;
  masterTotal: number;
  shortlistedCount: number;
  weekly: {
    addedToday: number;
    addedThisWeek: number;
    addedThisMonth: number;
    rejectedByTransformariThisWeek: number;
    rejectedPctThisWeek: number | null;
    acceptedPct: number | null;
  };
  funnel: { stage: string; count: number }[];
  geography: { bucket: string; count: number }[];
  irFunctions: { name: string; count: number }[];
  rejectionByWho: { week: { name: string; count: number }[]; all: { name: string; count: number }[] };
  rejectionByReason: { week: { name: string; count: number }[]; all: { name: string; count: number }[] };
  topFirms: { firm: string; count: number }[];
  peCoverage: { sourced: number; total: number };
  seniority: { vp: number; seniorAssociate: number; tooSenior: number };
  activity: { id: string; created_at: string; user_name: string | null; description: string }[];
};

const ACTIVE_EXCLUDE = new Set<string>([
  "Placed",
  ...REJECTED_STAGES,
]);

function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday start
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    const { supabase, userId } = context;

    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    const role = (roleRow?.role as "recruiter" | "client") ?? "client";

    const { data: candidates } = await supabase
      .from("candidates")
      .select("id, created_at, updated_at, date_sourced, pipeline_stage, location_bucket, ir_functions, shortlisted, screen_out_reason, current_firm, current_title");

    const list = (candidates ?? []) as Array<{
      id: string; created_at: string; updated_at: string; date_sourced: string | null;
      pipeline_stage: string; location_bucket: string | null;
      ir_functions: string[]; shortlisted: boolean;
      screen_out_reason: string | null; current_firm: string | null; current_title: string | null;
    }>;

    const { data: settings } = await supabase
      .from("app_settings")
      .select("search_start_date")
      .eq("id", true)
      .maybeSingle();
    const searchStartDate = (settings?.search_start_date as string | undefined) ?? "2026-04-01";
    const searchInitiated = `${searchStartDate}T00:00:00.000Z`;
    const daysActive = Math.max(
      0,
      Math.floor((Date.now() - new Date(searchInitiated).getTime()) / 86400000),
    );

    const candidatesInPipeline = list.filter((c) => !ACTIVE_EXCLUDE.has(c.pipeline_stage)).length;
    const masterTotal = list.filter((c) => c.pipeline_stage !== "Placed").length;
    const shortlistedCount = list.filter((c) => c.shortlisted).length;

    const today = todayIsoDate();
    const weekStart = startOfWeekIso();
    const addedToday = list.filter((c) => (c.date_sourced ?? c.created_at.slice(0, 10)) === today).length;
    const addedThisWeek = list.filter((c) => {
      const d = c.date_sourced ?? c.created_at.slice(0, 10);
      return d >= weekStart.slice(0, 10);
    }).length;
    const monthStart = today.slice(0, 7) + "-01";
    const addedThisMonth = list.filter((c) => {
      const d = c.date_sourced ?? c.created_at.slice(0, 10);
      return d >= monthStart;
    }).length;
    const rejectedByTransformariThisWeek = list.filter(
      (c) => c.pipeline_stage === "Rejected by Transformari" && c.updated_at >= weekStart,
    ).length;
    const rejectedPctThisWeek = addedThisWeek > 0
      ? Math.round((rejectedByTransformariThisWeek / addedThisWeek) * 100)
      : null;
    const NON_ACCEPTED = new Set<string>(["Sourced", "For Sean - Please reach out", ...REJECTED_STAGES]);
    const acceptedCount = list.filter((c) => !NON_ACCEPTED.has(c.pipeline_stage)).length;
    const acceptedPct = list.length > 0 ? Math.round((acceptedCount / list.length) * 100) : null;

    const funnel = PIPELINE_STAGES.map((stage) => ({
      stage,
      count: list.filter((c) => c.pipeline_stage === stage).length,
    }));

    const geoBuckets = ["Florida", "Texas", "Tri-State", "Other US", "International"];
    const geography = geoBuckets.map((b) => ({
      bucket: b,
      count: list.filter((c) => c.location_bucket === b).length,
    }));

    const irFunctions = IR_FUNCTIONS.map((name) => ({
      name,
      count: list.filter((c) => Array.isArray(c.ir_functions) && c.ir_functions.includes(name)).length,
    }));

    const rejectionByWhoAll = REJECTED_STAGES.map((s) => ({
      name: s,
      count: list.filter((c) => c.pipeline_stage === s).length,
    }));
    const rejectionByWhoWeek = REJECTED_STAGES.map((s) => ({
      name: s,
      count: list.filter((c) => c.pipeline_stage === s && c.updated_at >= weekStart).length,
    }));

    const reasonGroup = (filterFn: (c: typeof list[number]) => boolean) => {
      const m = new Map<string, number>();
      for (const c of list) {
        if (!c.screen_out_reason) continue;
        if (!filterFn(c)) continue;
        m.set(c.screen_out_reason, (m.get(c.screen_out_reason) ?? 0) + 1);
      }
      return Array.from(m.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };
    const rejectionByReasonAll = reasonGroup(() => true);
    const rejectionByReasonWeek = reasonGroup((c) => c.updated_at >= weekStart);

    const reachedOutSet = new Set(PIPELINE_STAGES.filter((s) => s !== "Sourced" && s !== "For Sean - Please reach out"));
    const firmCounts = new Map<string, number>();
    for (const c of list) {
      if (!c.current_firm) continue;
      if (!reachedOutSet.has(c.pipeline_stage as never)) continue;
      firmCounts.set(c.current_firm, (firmCounts.get(c.current_firm) ?? 0) + 1);
    }
    const topFirms = Array.from(firmCounts.entries())
      .map(([firm, count]) => ({ firm, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Seniority buckets from current_title (case-insensitive). Order matters: too senior takes priority.
    const TOO_SENIOR_RE = /\b(managing director|md|principal|head of|partner|chief|cio|cfo|coo|ceo|president)\b/i;
    const VICE_PRES_RE = /\bvice president\b/i;
    const VP_RE = /\b(vp|svp|evp)\b/i;
    const SR_ASSOC_RE = /\b(senior associate|sr\.? associate)\b/i;
    let vp = 0, seniorAssociate = 0, tooSenior = 0;
    for (const c of list) {
      const t = (c.current_title ?? "").toString();
      if (!t) continue;
      // "too senior" wins over VP unless the only senior match is "vice president"
      const tooSeniorHit = TOO_SENIOR_RE.test(t) && !(VICE_PRES_RE.test(t) && !/(managing director|\bmd\b|principal|head of|partner|chief|\bcio\b|\bcfo\b|\bcoo\b|\bceo\b|president)/i.test(t));
      if (tooSeniorHit) { tooSenior++; continue; }
      if (VP_RE.test(t) || VICE_PRES_RE.test(t)) { vp++; continue; }
      if (SR_ASSOC_RE.test(t)) { seniorAssociate++; continue; }
    }

    let peCoverage = { sourced: 0, total: TOTAL_PE_UNIVERSE };
    let activity: DashboardData["activity"] = [];

    if (role === "recruiter") {
      const { count } = await supabase
        .from("pe_firms")
        .select("*", { count: "exact", head: true })
        .in("status", ["Contacted", "Sourced From", "Searched--candidates added"]);
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
        if (row.action === "stage_change" && p.name) description = `${p.name} moved from ${p.from} to ${p.to}`;
        else if (row.action === "candidate_created" && p.name) description = `${p.name} added to pipeline`;
        return {
          id: row.id, created_at: row.created_at,
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
      shortlistedCount,
      weekly: {
        addedToday,
        addedThisWeek,
        addedThisMonth,
        rejectedByTransformariThisWeek,
        rejectedPctThisWeek,
        acceptedPct,
      },
      funnel,
      geography,
      irFunctions,
      rejectionByWho: { week: rejectionByWhoWeek, all: rejectionByWhoAll },
      rejectionByReason: { week: rejectionByReasonWeek, all: rejectionByReasonAll },
      topFirms,
      peCoverage,
      seniority: { vp, seniorAssociate, tooSenior },
      activity,
    };
  });
