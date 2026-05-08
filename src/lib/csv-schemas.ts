import { z } from "zod";

export const PIPELINE_STAGES = [
  "Sourced", "Contacted", "Engaged", "Screening", "Client Interview", "Offer", "Placed", "Declined", "Passed",
] as const;
export const LOCATION_BUCKETS = ["Florida", "Texas", "Tri-State", "Other US", "International"] as const;
export const IR_FUNCTIONS = ["Capital Raising", "LP Relations", "Reporting & Analytics", "Marketing & Comms", "Strategy"] as const;
export const PE_STATUSES = ["Target", "Contacted", "Sourced From", "Declined", "Not Relevant"] as const;
export const PE_TIERS = ["Tier 1", "Tier 2", "Tier 3"] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type LocationBucket = (typeof LOCATION_BUCKETS)[number];
export type IrFunction = (typeof IR_FUNCTIONS)[number];

const optStr = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().max(500).optional());
const optBool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(s)) return true;
    if (["false", "no", "n", "0", ""].includes(s)) return false;
  }
  return undefined;
}, z.boolean().optional());

export const candidateRowSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  email: optStr.pipe(z.string().email().optional() as never).or(z.undefined()).optional(),
  phone: optStr,
  current_firm: optStr,
  current_title: optStr,
  pipeline_stage: z.preprocess((v) => (v ? String(v).trim() : "Sourced"), z.enum(PIPELINE_STAGES)),
  location_bucket: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
    z.enum(LOCATION_BUCKETS).optional(),
  ),
  ir_functions: z.preprocess(
    (v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string" && v.trim()) return v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
      return [];
    },
    z.array(z.enum(IR_FUNCTIONS)).default([]),
  ),
  source: optStr,
  linkedin_url: optStr,
  notes: optStr,
  client_visible: optBool,
  shortlisted: optBool,
});
export type CandidateRow = z.infer<typeof candidateRowSchema>;

export const peFirmRowSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(200),
  tier: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : undefined), z.enum(PE_TIERS).optional()),
  status: z.preprocess((v) => (v ? String(v).trim() : "Target"), z.enum(PE_STATUSES)),
  aum_usd: z.preprocess(
    (v) => {
      if (v === "" || v == null) return undefined;
      const n = typeof v === "number" ? v : Number(String(v).replace(/[$,_\s]/g, ""));
      return Number.isFinite(n) ? Math.round(n) : v;
    },
    z.number().int().nonnegative().optional(),
  ),
  hq_city: optStr,
  hq_state: optStr,
  notes: optStr,
});
export type PeFirmRow = z.infer<typeof peFirmRowSchema>;

export const CANDIDATE_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "current_firm", label: "Current firm" },
  { key: "current_title", label: "Current title" },
  { key: "pipeline_stage", label: "Pipeline stage" },
  { key: "location_bucket", label: "Location" },
  { key: "ir_functions", label: "IR functions (comma-separated)" },
  { key: "source", label: "Source" },
  { key: "linkedin_url", label: "LinkedIn URL" },
  { key: "notes", label: "Notes" },
  { key: "client_visible", label: "Client visible" },
] as const;

export const PE_FIELDS = [
  { key: "name", label: "Firm name", required: true },
  { key: "tier", label: "Tier" },
  { key: "status", label: "Status" },
  { key: "aum_usd", label: "AUM (USD)" },
  { key: "hq_city", label: "HQ city" },
  { key: "hq_state", label: "HQ state" },
  { key: "notes", label: "Notes" },
] as const;
