import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PIPELINE_STAGES, LOCATION_BUCKETS, IR_FUNCTIONS } from "@/lib/csv-schemas";

const filtersSchema = z.object({
  search: z.string().optional(),
  stage: z.enum(PIPELINE_STAGES).optional(),
  location: z.enum(LOCATION_BUCKETS).optional(),
  irFunction: z.enum(IR_FUNCTIONS).optional(),
  clientVisible: z.enum(["yes", "no", "all"]).default("all"),
}).default({ clientVisible: "all" });

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filtersSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    let q = supabase.from("candidates").select("*").order("updated_at", { ascending: false });
    if (data.stage) q = q.eq("pipeline_stage", data.stage);
    if (data.location) q = q.eq("location_bucket", data.location);
    if (data.irFunction) q = q.contains("ir_functions", [data.irFunction]);
    if (data.clientVisible === "yes") q = q.eq("client_visible", true);
    if (data.clientVisible === "no") q = q.eq("client_visible", false);
    if (data.search) {
      const s = data.search.replace(/[%_]/g, "");
      q = q.or(`name.ilike.%${s}%,current_firm.ilike.%${s}%,email.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getCandidate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: candidate, error } = await supabase.from("candidates").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!candidate) return { candidate: null, activity: [], role: "client" as const };

    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    const role = (roleRow?.role as "recruiter" | "client") ?? "client";

    let activity: { id: string; created_at: string; action: string; payload: unknown; user_name: string | null }[] = [];
    if (role === "recruiter") {
      const { data: log } = await supabase
        .from("activity_log").select("id, created_at, action, payload, user_id")
        .eq("entity_id", data.id).order("created_at", { ascending: false }).limit(50);
      const ids = Array.from(new Set((log ?? []).map((l) => l.user_id).filter(Boolean) as string[]));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] as { id: string; full_name: string | null; email: string }[] };
      const map = new Map((profs ?? []).map((p) => [p.id, p.full_name || p.email]));
      activity = (log ?? []).map((l) => ({
        id: l.id, created_at: l.created_at, action: l.action, payload: l.payload,
        user_name: l.user_id ? map.get(l.user_id) ?? null : null,
      }));
    }
    return { candidate, activity, role };
  });

const candidateInput = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(50).optional().or(z.literal("").transform(() => undefined)),
  current_firm: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
  current_title: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
  pipeline_stage: z.enum(PIPELINE_STAGES).default("Sourced"),
  location_bucket: z.enum(LOCATION_BUCKETS).optional(),
  ir_functions: z.array(z.enum(IR_FUNCTIONS)).default([]),
  source: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
  linkedin_url: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().max(10000).optional().or(z.literal("").transform(() => undefined)),
  next_action: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  next_action_date: z.string().optional().or(z.literal("").transform(() => undefined)),
  last_contact_date: z.string().optional().or(z.literal("").transform(() => undefined)),
  client_visible: z.boolean().default(false),
});

export const createCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => candidateInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("candidates").insert({ ...data, created_by: userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), patch: candidateInput.partial() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("candidates").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("candidates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
