import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  PIPELINE_STAGES, LOCATION_BUCKETS, IR_FUNCTIONS,
  OWNERS, SOURCED_BY_OPTIONS, SCREEN_OUT_REASONS, CANDIDATE_FITS,
} from "@/lib/csv-schemas";
import { Search, X } from "lucide-react";

export type Filters = {
  search: string;
  stage: string;
  location: string;
  irFunction: string;
  owner: string;
  sourcedBy: string;
  screenOutReason: string;
  fit: string;
  clientVisible: "yes" | "no" | "all";
};

export const defaultFilters: Filters = {
  search: "", stage: "", location: "", irFunction: "",
  owner: "", sourcedBy: "", screenOutReason: "", fit: "",
  clientVisible: "all",
};

const ANY = "__any__";

export function CandidateFilters({
  value, onChange, role,
}: { value: Filters; onChange: (v: Filters) => void; role: "recruiter" | "client" }) {
  const has = value.search || value.stage || value.location || value.irFunction
    || value.owner || value.sourcedBy || value.screenOutReason || value.fit || value.clientVisible !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-soft)]">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search name, firm, email…"
          className="pl-8 h-9"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </div>
      <FilterSelect placeholder="Stage" value={value.stage} options={PIPELINE_STAGES} onChange={(v) => onChange({ ...value, stage: v })} />
      <FilterSelect placeholder="Fit" value={value.fit} options={CANDIDATE_FITS} onChange={(v) => onChange({ ...value, fit: v })} />
      <FilterSelect placeholder="Location" value={value.location} options={LOCATION_BUCKETS} onChange={(v) => onChange({ ...value, location: v })} />
      <FilterSelect placeholder="IR function" value={value.irFunction} options={IR_FUNCTIONS} onChange={(v) => onChange({ ...value, irFunction: v })} />
      {role === "recruiter" && (
        <>
          <FilterSelect placeholder="Owner" value={value.owner} options={OWNERS} onChange={(v) => onChange({ ...value, owner: v })} />
          <FilterSelect placeholder="Sourced by" value={value.sourcedBy} options={SOURCED_BY_OPTIONS} onChange={(v) => onChange({ ...value, sourcedBy: v })} />
          <FilterSelect placeholder="Screen out reason" value={value.screenOutReason} options={SCREEN_OUT_REASONS} onChange={(v) => onChange({ ...value, screenOutReason: v })} />
          <Select value={value.clientVisible} onValueChange={(v) => onChange({ ...value, clientVisible: v as Filters["clientVisible"] })}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visibility</SelectItem>
              <SelectItem value="yes">Client visible</SelectItem>
              <SelectItem value="no">Internal only</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      {has && (
        <Button variant="ghost" size="sm" onClick={() => onChange(defaultFilters)}>
          <X className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}

function FilterSelect({ placeholder, value, options, onChange }: { placeholder: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value || ANY} onValueChange={(v) => onChange(v === ANY ? "" : v)}>
      <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>All {placeholder.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
