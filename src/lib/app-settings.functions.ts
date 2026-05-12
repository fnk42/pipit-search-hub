import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("app_settings")
      .select("search_start_date")
      .eq("id", true)
      .maybeSingle();
    if (error) throw error;
    return { search_start_date: (data?.search_start_date as string | undefined) ?? "2026-04-01" };
  });

export const updateSearchStartDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ search_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("app_settings")
      .upsert({ id: true, search_start_date: data.search_start_date, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { ok: true };
  });
