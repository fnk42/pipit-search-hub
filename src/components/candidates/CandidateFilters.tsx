import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  PIPELINE_STAGES, LOCATION_BUCKETS, IR_FUNCTIONS,
  SCREEN_OUT_REASONS, CANDIDATE_FITS,
} from "@/lib/csv-schemas";
import { Search, X } from "lucide-react";

export type Filters = {
  search: string;
  stage: string;
  location: string;
  irFunction: string;
  screenOutReason: string;
  fit: string;
  clientVisible: "yes" | "no" | "all";
};

export const defaultFilters: Filters = {
  search: "", stage: "", location: "", irFunction: "",
  screenOutReason: "", fit: "",
  clientVisible: "all",
};

const ANY = "__any__";

const TRIGGER = "h-10 min-w-[160px] rounded-lg border-[#D0D5DD] bg-white text-sm text-[#101828] focus:border-[#1570EF] focus:ring-4 focus:ring-[#E0EAFF]";

export function CandidateFilters({
  value, onChange, role,
}: { value: Filters; onChange: (v: Filters) => void; role: "recruiter" | "client" }) {
  const has = value.search || value.stage || value.location || value.irFunction
    || value.screenOutReason || value.fit || value.clientVisible !== "all";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#667085]" />
        <Input
          placeholder="Search name, firm, email…"
          className="pl-10 h-10 rounded-lg border-[#D0D5DD] bg-white text-sm text-[#101828] placeholder:text-[#667085] focus-visible:border-[#1570EF] focus-visible:ring-4 focus-visible:ring-[#E0EAFF]"
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
          <FilterSelect placeholder="Screen out reason" value={value.screenOutReason} options={SCREEN_OUT_REASONS} onChange={(v) => onChange({ ...value, screenOutReason: v })} />
          <Select value={value.clientVisible} onValueChange={(v) => onChange({ ...value, clientVisible: v as Filters["clientVisible"] })}>
            <SelectTrigger className={TRIGGER}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visibility</SelectItem>
              <SelectItem value="yes">Client visible</SelectItem>
              <SelectItem value="no">Internal only</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      {has && (
        <Button variant="ghost" size="sm" onClick={() => onChange(defaultFilters)} className="h-10">
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}

function FilterSelect({ placeholder, value, options, onChange }: { placeholder: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value || ANY} onValueChange={(v) => onChange(v === ANY ? "" : v)}>
      <SelectTrigger className={TRIGGER}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>All {placeholder.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
