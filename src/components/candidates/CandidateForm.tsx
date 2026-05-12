import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  PIPELINE_STAGES, LOCATION_BUCKETS, IR_FUNCTIONS, REJECTED_STAGES,
  OWNERS, SOURCED_BY_OPTIONS, SCREEN_OUT_REASONS, CANDIDATE_FITS,
} from "@/lib/csv-schemas";
import { X } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email().or(z.literal("")).optional(),
  phone: z.string().max(50).optional(),
  current_firm: z.string().max(200).optional(),
  current_title: z.string().max(200).optional(),
  pipeline_stage: z.enum(PIPELINE_STAGES),
  location_bucket: z.enum([...LOCATION_BUCKETS, "" as const]).optional(),
  ir_functions: z.array(z.enum(IR_FUNCTIONS)),
  sourced_by: z.enum(SOURCED_BY_OPTIONS),
  owner: z.enum([...OWNERS, "" as const]).optional(),
  screen_out_reason: z.enum([...SCREEN_OUT_REASONS, "" as const]).optional(),
  feedback_transformari: z.string().max(10000).optional(),
  fnk_comments: z.string().max(10000).optional(),
  linkedin_url: z.string().max(500).optional(),
  notes: z.string().max(10000).optional(),
  date_sourced: z.string().optional(),
  client_visible: z.boolean(),
  fit: z.enum(CANDIDATE_FITS).default("Unassessed"),
});

export type CandidateFormValues = z.infer<typeof schema>;

const REJ_SET = new Set<string>(REJECTED_STAGES);

export function CandidateForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save",
  compact = false,
}: {
  defaultValues?: Partial<CandidateFormValues>;
  onSubmit: (values: CandidateFormValues) => Promise<void> | void;
  submitLabel?: string;
  compact?: boolean;
}) {
  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      pipeline_stage: "Sourced",
      sourced_by: "GPR Team",
      ir_functions: [],
      client_visible: false,
      fit: "Unassessed",
      ...defaultValues,
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const irFunctions = form.watch("ir_functions") ?? [];
  const stage = form.watch("pipeline_stage");
  const isRejected = REJ_SET.has(stage);

  const toggleIr = (fn: (typeof IR_FUNCTIONS)[number]) => {
    const next = irFunctions.includes(fn) ? irFunctions.filter((f) => f !== fn) : [...irFunctions, fn];
    form.setValue("ir_functions", next, { shouldDirty: true });
  };

  return (
    <form
      onSubmit={form.handleSubmit(async (v) => {
        setSubmitting(true);
        try {
          await onSubmit({
            ...v,
            location_bucket: (v.location_bucket || undefined) as never,
            owner: (v.owner || undefined) as never,
            screen_out_reason: (isRejected ? v.screen_out_reason || undefined : undefined) as never,
          });
        } finally { setSubmitting(false); }
      })}
      className="space-y-5"
    >
      <div className={compact ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
        <Field label="Name" required error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </Field>
        <Field label="Candidate status" required>
          <Select
            value={form.watch("pipeline_stage")}
            onValueChange={(v) => form.setValue("pipeline_stage", v as never, { shouldDirty: true })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {!compact && <>
          <Field label="Email"><Input type="email" {...form.register("email")} /></Field>
          <Field label="Phone"><Input {...form.register("phone")} /></Field>
          <Field label="Current firm"><Input {...form.register("current_firm")} /></Field>
          <Field label="Current title"><Input {...form.register("current_title")} /></Field>
          <Field label="Location">
            <Select
              value={form.watch("location_bucket") || ""}
              onValueChange={(v) => form.setValue("location_bucket", (v || undefined) as never, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {LOCATION_BUCKETS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Owner">
            <Select
              value={form.watch("owner") || ""}
              onValueChange={(v) => form.setValue("owner", (v || undefined) as never, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {OWNERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sourced by">
            <Select
              value={form.watch("sourced_by")}
              onValueChange={(v) => form.setValue("sourced_by", v as never, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCED_BY_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="LinkedIn URL"><Input {...form.register("linkedin_url")} /></Field>
          <Field label="Sourced date"><Input type="date" {...form.register("date_sourced")} /></Field>
          {isRejected && (
            <Field label="Screen out reason">
              <Select
                value={form.watch("screen_out_reason") || ""}
                onValueChange={(v) => form.setValue("screen_out_reason", (v || undefined) as never, { shouldDirty: true })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {SCREEN_OUT_REASONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
        </>}
      </div>

      {!compact && (
        <Field label="IR functions">
          <div className="flex flex-wrap gap-2">
            {IR_FUNCTIONS.map((fn) => {
              const active = irFunctions.includes(fn);
              return (
                <button
                  type="button" key={fn} onClick={() => toggleIr(fn)}
                  className={`text-xs rounded-full px-3 py-1 border transition ${active ? "bg-accent text-accent-foreground border-accent" : "bg-background text-foreground border-border hover:border-accent/40"}`}
                >
                  {fn}
                  {active && <X className="inline h-3 w-3 ml-1" />}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      {!compact && (
        <Field label="Feedback (Transformari)">
          <Textarea rows={4} {...form.register("feedback_transformari")} placeholder="Internal feedback from Transformari…" />
        </Field>
      )}

      {!compact && (
        <Field label="FNK Comments">
          <Textarea rows={4} {...form.register("fnk_comments")} placeholder="Internal FNK comments…" />
        </Field>
      )}

      {!compact && (
        <Field label="Notes"><Textarea rows={4} {...form.register("notes")} /></Field>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-md border border-border bg-card p-3 gap-3">
          <div className="min-w-0">
            <Label className="text-sm">Fit</Label>
            <p className="text-xs text-muted-foreground">"Target Fit" adds the candidate to the shortlist (auto-visible to client).</p>
          </div>
          <Select
            value={form.watch("fit") ?? "Unassessed"}
            onValueChange={(v) => form.setValue("fit", v as never, { shouldDirty: true })}
          >
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CANDIDATE_FITS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
          <div>
            <Label className="text-sm">Visible to client</Label>
            <p className="text-xs text-muted-foreground">Show this candidate in Sean's view.</p>
          </div>
          <Switch
            checked={form.watch("client_visible")}
            onCheckedChange={(v) => form.setValue("client_visible", v, { shouldDirty: true })}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {form.formState.isDirty && (
          <Badge variant="secondary" className="mr-auto">Unsaved changes</Badge>
        )}
        <Button type="submit" disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
