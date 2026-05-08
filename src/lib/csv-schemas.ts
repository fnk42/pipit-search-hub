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

// ---------- Value-level normalizers ----------

const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

const PIPELINE_VALUE_ALIASES: Record<string, PipelineStage> = {
  // Sourced
  "sourced": "Sourced", "new": "Sourced", "lead": "Sourced",
  "for sean please reach out": "Sourced", "for sean to reach out": "Sourced",
  // Contacted
  "contacted": "Contacted", "outreach": "Contacted", "reached out": "Contacted",
  "reached out referral": "Contacted", "reached out-referral": "Contacted",
  // Engaged
  "engaged": "Engaged", "responding": "Engaged", "in conversation": "Engaged",
  "responded scheduled for screening": "Engaged", "responded": "Engaged",
  // Screening
  "screening": "Screening", "screen": "Screening", "phone screen": "Screening", "interviewing": "Screening",
  "initial screening": "Screening", "initial screening sam stephanie": "Screening",
  "final screening": "Screening", "final screening sean": "Screening",
  "profile screened by stephanie": "Screening", "profile screened by sam": "Screening", "profile screened": "Screening",
  // Client Interview
  "client interview": "Client Interview", "client interviews": "Client Interview", "client int": "Client Interview", "with client": "Client Interview",
  // Offer
  "offer": "Offer", "offer extended": "Offer",
  // Placed
  "placed": "Placed", "hired": "Placed",
  // Declined (rejected by us / client / firm)
  "declined": "Declined", "rejected": "Declined",
  "rejected by transformari": "Declined", "rejected by client": "Declined",
  "rejected by gpr": "Declined", "rejected by gpr felix": "Declined",
  "passed by client": "Declined",
  // Passed (candidate-side withdrawal/rejection)
  "passed": "Passed", "not interested": "Passed",
  "rejected by candidate": "Passed", "candidate passed": "Passed",
  "withdrew": "Passed", "withdrawn": "Passed",
};

const IR_VALUE_ALIASES: Record<string, IrFunction> = {
  "capital raising": "Capital Raising", "fundraising": "Capital Raising", "fundraising bd": "Capital Raising",
  "bd": "Capital Raising", "business development": "Capital Raising", "capital formation": "Capital Raising",
  "lp relations": "LP Relations", "lp relationships": "LP Relations", "investor relations": "LP Relations",
  "client services": "LP Relations", "client services lp reporting": "LP Relations", "lp servicing": "LP Relations", "client service": "LP Relations",
  "reporting analytics": "Reporting & Analytics", "reporting": "Reporting & Analytics", "analytics": "Reporting & Analytics",
  "ir reporting": "Reporting & Analytics", "data": "Reporting & Analytics",
  "marketing comms": "Marketing & Comms", "marketing": "Marketing & Comms", "communications": "Marketing & Comms", "comms": "Marketing & Comms", "content": "Marketing & Comms",
  "strategy": "Strategy", "ir strategy": "Strategy",
};

const TRI_STATE = new Set(["NY", "NJ", "CT"]);
const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","DE","DC","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT",
  "NE","NV","NH","NM","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","UT","VT","VA","WA","WV","WI","WY",
]);
const INTL_HINTS = ["london", "uk", "england", "scotland", "ireland", "dublin", "paris", "france", "germany", "berlin", "munich",
  "zurich", "switzerland", "geneva", "amsterdam", "netherlands", "madrid", "spain", "milan", "italy", "rome",
  "stockholm", "sweden", "oslo", "norway", "copenhagen", "denmark", "helsinki", "finland",
  "tokyo", "japan", "singapore", "hong kong", "shanghai", "beijing", "china", "seoul", "korea",
  "sydney", "melbourne", "australia", "toronto", "vancouver", "montreal", "canada", "mexico", "brazil", "dubai", "uae"];

function bucketLocation(raw: string): LocationBucket | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const lower = t.toLowerCase();
  // Direct bucket match
  const direct = LOCATION_BUCKETS.find((b) => b.toLowerCase() === lower);
  if (direct) return direct;
  if (lower.includes("tri-state") || lower.includes("tri state")) return "Tri-State";
  if (INTL_HINTS.some((h) => lower.includes(h))) return "International";
  // State code: last token after comma, or 2-letter token
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
  if (TRI_STATE.has(state) || ["new york", "new jersey", "connecticut"].some((s) => lower.includes(s))) return "Tri-State";
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
  // Dedupe valid values only
  const valid = mapped.filter((s): s is IrFunction => (IR_FUNCTIONS as readonly string[]).includes(s));
  return Array.from(new Set(valid));
}

function aliasLocation(v: unknown): unknown {
  if (typeof v !== "string" || !v.trim()) return undefined;
  return bucketLocation(v) ?? undefined;
}

function aliasDate(v: unknown): unknown {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return undefined;
  // mm/dd/yyyy or m/d/yy(yy)
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, mm, dd, yy] = m;
    if (yy.length === 2) yy = (Number(yy) > 50 ? "19" : "20") + yy;
    return `${yy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // yyyy-mm-dd already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : undefined;
}

export const candidateRowSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  email: optStr.pipe(z.string().email().optional() as never).or(z.undefined()).optional(),
  phone: optStr,
  current_firm: optStr,
  current_title: optStr,
  pipeline_stage: z.preprocess(aliasPipeline, z.enum(PIPELINE_STAGES)),
  location_bucket: z.preprocess(aliasLocation, z.enum(LOCATION_BUCKETS).optional()),
  ir_functions: z.preprocess(aliasIrFunctions, z.array(z.enum(IR_FUNCTIONS)).default([])),
  source: optStr,
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
  name: ["name", "full name", "candidate", "candidate name"],
  email: ["email", "email address", "e-mail", "mail"],
  phone: ["phone", "phone number", "mobile", "cell", "telephone"],
  current_firm: ["firm", "firm name", "company", "company name", "employer", "organization", "organisation", "current company", "current employer", "current firm"],
  current_title: ["title", "job title", "position", "role", "current title", "current position", "current role"],
  pipeline_stage: ["stage", "pipeline", "pipeline stage", "status", "candidate status"],
  location_bucket: ["location", "region", "market", "geo", "city", "city state"],
  ir_functions: ["function", "functions", "ir function", "ir functions"],
  source: ["source", "lead source", "sourced from", "sourced by", "referrer", "owner"],
  linkedin_url: ["linkedin", "linkedin url", "linkedin profile", "profile url"],
  notes: ["notes", "comments", "remarks"],
  date_sourced: ["date sourced", "sourced date", "date added", "added on", "source date"],
  client_visible: ["client visible", "visible", "show client"],
  shortlisted: ["shortlisted", "shortlist", "starred"],
};

export const PE_HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "firm", "firm name", "fund", "fund name"],
  tier: ["tier"],
  status: ["status"],
  aum_usd: ["aum", "aum usd", "assets", "assets under management"],
  hq_city: ["city", "hq city", "headquarters city"],
  hq_state: ["state", "hq state", "headquarters state"],
  notes: ["notes", "comments", "remarks"],
};

export const CANDIDATE_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "current_firm", label: "Current firm" },
  { key: "current_title", label: "Current title" },
  { key: "pipeline_stage", label: "Pipeline stage" },
  { key: "location_bucket", label: "Location" },
  { key: "ir_functions", label: "IR functions (comma-separated)" },
  { key: "source", label: "Sourced by" },
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
