import { z } from "zod";

export const PIPELINE_STAGES = [
  "Sourced",
  "For Sean - Please reach out",
  "Reached Out",
  "Reached Out-Referral",
  "Responded/Scheduled for Screening",
  "Profile Screened by Sam",
  "Profile Screened by Stephanie",
  "Initial Screening (Sam/Stephanie)",
  "Final Screening (Sean)",
  "Client Interviews",
  "Offer",
  "Placed",
  "Rejected by Candidate",
  "Rejected by Transformari",
  "Rejected by Client",
  "Rejected by GPR (Felix)",
] as const;

export const REJECTED_STAGES = [
  "Rejected by Candidate",
  "Rejected by Transformari",
  "Rejected by Client",
  "Rejected by GPR (Felix)",
] as const;

export const REACHED_OUT_OR_LATER = PIPELINE_STAGES.filter(
  (s) => s !== "Sourced" && s !== "For Sean - Please reach out",
);

export const LOCATION_BUCKETS = ["Florida", "Texas", "Tri-State", "Other US", "International"] as const;
export const IR_FUNCTIONS = ["Fundraising/BD", "Client Services/LP Reporting", "Unclear"] as const;
export const OWNERS = ["Sam", "Stephanie", "Sean"] as const;
export const SOURCED_BY_OPTIONS = ["GPR Team", "Transformari"] as const;
export const SCREEN_OUT_REASONS = [
  "Location",
  "Timing",
  "< 1 Year in Current Role",
  "< 5 Years Relevant Experience",
  "Insufficient relevant experience",
  "Irrelevant profile",
  "Not interested in firm/role/setup",
  "Compensation",
  "Other",
] as const;

export const PE_STATUSES = ["Target", "Contacted", "Sourced From", "Declined", "Not Relevant"] as const;
export const PE_TIERS = ["Tier 1", "Tier 2", "Tier 3"] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type LocationBucket = (typeof LOCATION_BUCKETS)[number];
export type IrFunction = (typeof IR_FUNCTIONS)[number];
export type Owner = (typeof OWNERS)[number];
export type SourcedBy = (typeof SOURCED_BY_OPTIONS)[number];
export type ScreenOutReason = (typeof SCREEN_OUT_REASONS)[number];

const optStr = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().max(2000).optional());
const optBool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(s)) return true;
    if (["false", "no", "n", "0", ""].includes(s)) return false;
  }
  return undefined;
}, z.boolean().optional());

const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

const PIPELINE_VALUE_ALIASES: Record<string, PipelineStage> = {
  "sourced": "Sourced", "new": "Sourced", "lead": "Sourced",
  "for sean please reach out": "For Sean - Please reach out", "for sean to reach out": "For Sean - Please reach out",
  "reached out": "Reached Out", "contacted": "Reached Out", "outreach": "Reached Out",
  "reached out referral": "Reached Out-Referral", "reached out-referral": "Reached Out-Referral",
  "responded scheduled for screening": "Responded/Scheduled for Screening", "responded": "Responded/Scheduled for Screening", "engaged": "Responded/Scheduled for Screening",
  "profile screened by sam": "Profile Screened by Sam",
  "profile screened by stephanie": "Profile Screened by Stephanie",
  "initial screening": "Initial Screening (Sam/Stephanie)", "initial screening sam stephanie": "Initial Screening (Sam/Stephanie)", "screening": "Initial Screening (Sam/Stephanie)",
  "final screening": "Final Screening (Sean)", "final screening sean": "Final Screening (Sean)",
  "client interview": "Client Interviews", "client interviews": "Client Interviews",
  "offer": "Offer", "offer extended": "Offer",
  "placed": "Placed", "hired": "Placed",
  "rejected by candidate": "Rejected by Candidate", "passed": "Rejected by Candidate", "candidate passed": "Rejected by Candidate", "withdrew": "Rejected by Candidate", "withdrawn": "Rejected by Candidate", "not interested": "Rejected by Candidate",
  "rejected by transformari": "Rejected by Transformari", "declined": "Rejected by Transformari", "rejected": "Rejected by Transformari",
  "rejected by client": "Rejected by Client", "passed by client": "Rejected by Client",
  "rejected by gpr": "Rejected by GPR (Felix)", "rejected by gpr felix": "Rejected by GPR (Felix)", "rejected by felix": "Rejected by GPR (Felix)",
};

const IR_VALUE_ALIASES: Record<string, IrFunction> = {
  "fundraising bd": "Fundraising/BD", "fundraising": "Fundraising/BD", "bd": "Fundraising/BD",
  "capital raising": "Fundraising/BD", "capital formation": "Fundraising/BD", "business development": "Fundraising/BD",
  "client services lp reporting": "Client Services/LP Reporting", "client services": "Client Services/LP Reporting",
  "lp reporting": "Client Services/LP Reporting", "lp relations": "Client Services/LP Reporting",
  "investor relations": "Client Services/LP Reporting", "reporting": "Client Services/LP Reporting",
  "unclear": "Unclear", "unknown": "Unclear", "other": "Unclear",
};

const OWNER_ALIASES: Record<string, Owner> = {
  "sam": "Sam", "stephanie": "Stephanie", "steph": "Stephanie", "sean": "Sean",
};

const SOURCED_BY_ALIASES: Record<string, SourcedBy> = {
  "gpr team": "GPR Team", "gpr": "GPR Team", "golden pipit": "GPR Team",
  "transformari": "Transformari",
};

const TRI_STATE = new Set(["NY", "NJ", "CT"]);
const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","DE","DC","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT",
  "NE","NV","NH","NM","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","UT","VT","VA","WA","WV","WI","WY",
]);
const INTL_HINTS = ["london","uk","england","scotland","ireland","dublin","paris","france","germany","berlin","munich",
  "zurich","switzerland","geneva","amsterdam","netherlands","madrid","spain","milan","italy","rome",
  "stockholm","sweden","oslo","norway","copenhagen","denmark","helsinki","finland",
  "tokyo","japan","singapore","hong kong","shanghai","beijing","china","seoul","korea",
  "sydney","melbourne","australia","toronto","vancouver","montreal","canada","mexico","brazil","dubai","uae"];

function bucketLocation(raw: string): LocationBucket | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const lower = t.toLowerCase();
  const direct = LOCATION_BUCKETS.find((b) => b.toLowerCase() === lower);
  if (direct) return direct;
  if (lower.includes("tri-state") || lower.includes("tri state")) return "Tri-State";
  if (INTL_HINTS.some((h) => lower.includes(h))) return "International";
  const parts = t.split(",").map((p) => p.trim()).filter(Boolean);
  let state = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
  if (state.length > 2) {
    const m = state.match(/\b([A-Z]{2})\b/);
    state = m ? m[1] : "";
  }
  if (!state) {
    const m = t.toUpperCase().match(/\b([A-Z]{2})\b/);
    state = m ? m[1] : "";
  }
  if (state === "FL" || lower.includes("florida")) return "Florida";
  if (state === "TX" || lower.includes("texas")) return "Texas";
  if (TRI_STATE.has(state) || ["new york","new jersey","connecticut"].some((s) => lower.includes(s))) return "Tri-State";
  if (US_STATES.has(state)) return "Other US";
  return undefined;
}

function aliasPipeline(v: unknown): unknown {
  if (typeof v !== "string") return v ?? "Sourced";
  const t = v.trim();
  if (!t) return "Sourced";
  return PIPELINE_VALUE_ALIASES[norm(t)] ?? t;
}

function aliasIrFunctions(v: unknown): unknown {
  let arr: string[] = [];
  if (Array.isArray(v)) arr = v.filter((x): x is string => typeof x === "string");
  else if (typeof v === "string" && v.trim()) arr = v.split(/[,;|/]/).map((s) => s.trim()).filter(Boolean);
  const mapped = arr.map((s) => IR_VALUE_ALIASES[norm(s)] ?? s);
  const valid = mapped.filter((s): s is IrFunction => (IR_FUNCTIONS as readonly string[]).includes(s));
  return Array.from(new Set(valid));
}

function aliasLocation(v: unknown): unknown {
  if (typeof v !== "string" || !v.trim()) return undefined;
  return bucketLocation(v) ?? undefined;
}

function aliasOwner(v: unknown): unknown {
  if (typeof v !== "string" || !v.trim()) return undefined;
  return OWNER_ALIASES[norm(v)] ?? undefined;
}

function aliasSourcedBy(v: unknown): unknown {
  if (typeof v !== "string" || !v.trim()) return "GPR Team";
  return SOURCED_BY_ALIASES[norm(v)] ?? "GPR Team";
}

function aliasDate(v: unknown): unknown {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return undefined;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, mm, dd, yy] = m;
    if (yy.length === 2) yy = (Number(yy) > 50 ? "19" : "20") + yy;
    return `${yy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : undefined;
}

// Lenient email: accept anything, drop invalid silently. Picks first valid address if multiple are jammed in one cell.
const lenientEmail = z.preprocess((v) => {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const candidates = s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const hit = candidates.find((c) => emailRe.test(c));
  return hit ? hit.toLowerCase() : undefined;
}, z.string().email().optional());

export const candidateRowSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  email: lenientEmail,
  phone: optStr,
  current_firm: optStr,
  current_title: optStr,
  pipeline_stage: z.preprocess(aliasPipeline, z.enum(PIPELINE_STAGES)),
  location_bucket: z.preprocess(aliasLocation, z.enum(LOCATION_BUCKETS).optional()),
  ir_functions: z.preprocess(aliasIrFunctions, z.array(z.enum(IR_FUNCTIONS)).default([])),
  source: optStr,
  sourced_by: z.preprocess(aliasSourcedBy, z.enum(SOURCED_BY_OPTIONS).default("GPR Team")),
  owner: z.preprocess(aliasOwner, z.enum(OWNERS).optional()),
  screen_out_reason: optStr,
  feedback_transformari: optStr,
  fnk_comments: optStr,
  linkedin_url: optStr,
  notes: optStr,
  date_sourced: z.preprocess(aliasDate, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
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

export const CANDIDATE_HEADER_ALIASES: Record<string, string[]> = {
  name: ["name","full name","candidate","candidate name"],
  email: ["email","email address","e-mail","mail"],
  phone: ["phone","phone number","mobile","cell","telephone"],
  current_firm: ["firm","firm name","company","company name","employer","organization","organisation","current company","current employer","current firm"],
  current_title: ["title","job title","position","role","current title","current position","current role"],
  pipeline_stage: ["stage","pipeline","pipeline stage","status","candidate status"],
  location_bucket: ["location","region","market","geo","city","city state","state"],
  ir_functions: ["function","functions","ir function","ir functions"],
  source: ["source","lead source","sourced from","referrer"],
  sourced_by: ["sourced by","source by","provided by"],
  owner: ["owner","assignee","assigned to"],
  screen_out_reason: ["screen out reason","screened out reason","screened out reasons","rejection reason","rejected reason","rejected reasons","reason"],
  feedback_transformari: ["feedback transformari","feedback from transformari","transformari feedback","feedback"],
  fnk_comments: ["fnk comments","fnk","fnk notes","fnk comment"],
  linkedin_url: ["linkedin","linkedin url","linkedin profile","profile url"],
  notes: ["notes","comments","remarks"],
  date_sourced: ["date sourced","sourced date","date added","added on","source date"],
  client_visible: ["client visible","visible","show client"],
  shortlisted: ["shortlisted","shortlist","starred"],
};

export const PE_HEADER_ALIASES: Record<string, string[]> = {
  name: ["name","firm","firm name","fund","fund name"],
  tier: ["tier"],
  status: ["status"],
  aum_usd: ["aum","aum usd","assets","assets under management"],
  hq_city: ["city","hq city","headquarters city"],
  hq_state: ["state","hq state","headquarters state"],
  notes: ["notes","comments","remarks"],
};

export const CANDIDATE_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "current_firm", label: "Current firm" },
  { key: "current_title", label: "Current title" },
  { key: "pipeline_stage", label: "Candidate status" },
  { key: "location_bucket", label: "Location" },
  { key: "ir_functions", label: "IR functions (comma-separated)" },
  { key: "owner", label: "Owner" },
  { key: "sourced_by", label: "Sourced by" },
  { key: "screen_out_reason", label: "Screen out reason" },
  { key: "feedback_transformari", label: "Feedback (Transformari)" },
  { key: "fnk_comments", label: "FNK Comments" },
  { key: "date_sourced", label: "Date sourced" },
  { key: "linkedin_url", label: "LinkedIn URL" },
  { key: "notes", label: "Notes" },
  { key: "client_visible", label: "Client visible" },
  { key: "shortlisted", label: "Shortlisted" },
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
