import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { candidateRowSchema, peFirmRowSchema } from "@/lib/csv-schemas";

async function batchInsert<T extends Record<string, unknown>>(
  supabase: { from: (t: string) => { insert: (rows: T[]) => Promise<{ error: { message: string } | null }> } },
  table: string,
  rows: T[],
): Promise<{ inserted: number; errors: string[] }> {
  let inserted = 0;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) errors.push(`Batch ${i}-${i + chunk.length}: ${error.message}`);
    else inserted += chunk.length;
  }
  return { inserted, errors };
}

export const importCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(z.record(z.unknown())) }).parse(d))
  .handler(async ({ context, data }) => {
    const valid: Record<string, unknown>[] = [];
    const errors: string[] = [];
    data.rows.forEach((r, idx) => {
      const parsed = candidateRowSchema.safeParse(r);
      if (parsed.success) valid.push({ ...parsed.data, created_by: context.userId });
      else errors.push(`Row ${idx + 1}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    });
    if (valid.length === 0) return { inserted: 0, errors, skipped: data.rows.length };
    const res = await batchInsert(context.supabase as never, "candidates", valid as never);
    return { inserted: res.inserted, errors: [...errors, ...res.errors], skipped: data.rows.length - res.inserted };
  });

export const importPeFirms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(z.record(z.unknown())) }).parse(d))
  .handler(async ({ context, data }) => {
    const valid: Record<string, unknown>[] = [];
    const errors: string[] = [];
    data.rows.forEach((r, idx) => {
      const parsed = peFirmRowSchema.safeParse(r);
      if (parsed.success) valid.push(parsed.data);
      else errors.push(`Row ${idx + 1}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    });
    if (valid.length === 0) return { inserted: 0, errors, skipped: data.rows.length };
    const res = await batchInsert(context.supabase as never, "pe_firms", valid as never);
    return { inserted: res.inserted, errors: [...errors, ...res.errors], skipped: data.rows.length - res.inserted };
  });
