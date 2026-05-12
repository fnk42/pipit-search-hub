import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const peFirmInput = z.object({
  name: z.string().trim().min(1).max(200),
  status: z.enum(["Target", "Contacted", "Sourced From", "Declined", "Not Relevant"]).optional(),
  aum_b: z.number().nonnegative().nullable().optional(),
  hq: z.string().max(200).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  layer: z.string().max(200).nullable().optional(),
  next_layer_tag: z.string().max(200).nullable().optional(),
  aum_source: z.string().max(500).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const listPeFirms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pe_firms")
      .select("id, name, status, aum_b, hq, location, layer, next_layer_tag, aum_source, website, notes, created_at, updated_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPeFirm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => peFirmInput.parse(d))
  .handler(async ({ context, data }) => {
    const payload = { ...data, status: data.status ?? "Target" };
    const { data: row, error } = await context.supabase
      .from("pe_firms").insert(payload as never).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePeFirm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    patch: peFirmInput.partial(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("pe_firms").update(data.patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePeFirm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("pe_firms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
