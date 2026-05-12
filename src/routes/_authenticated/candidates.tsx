import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCandidates, setFit } from "@/lib/candidates.functions";
import { useAuth } from "@/lib/auth-context";
import { CandidatesTable } from "@/components/candidates/CandidatesTable";
import { CandidateFilters, defaultFilters, type Filters } from "@/components/candidates/CandidateFilters";
import { AddCandidateDialog } from "@/components/candidates/AddCandidateDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Upload, Star, X, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CANDIDATE_FITS, type CandidateFit } from "@/lib/csv-schemas";
import { toast } from "sonner";

const SENIORITIES = ["vp", "seniorAssociate", "other"] as const;
type Seniority = typeof SENIORITIES[number];
const SENIORITY_LABEL: Record<Seniority, string> = {
  vp: "VP",
  seniorAssociate: "Senior Associate",
  other: "Other",
};

const VP_RE = /\b(vp|svp|evp|vice president)\b/i;
const SR_ASSOC_RE = /\b(senior associate|sr\.? associate)\b/i;
function classify(title: string | null | undefined): Seniority {
  const t = (title ?? "").toString();
  if (VP_RE.test(t)) return "vp";
  if (SR_ASSOC_RE.test(t)) return "seniorAssociate";
  return "other";
}

type CandidatesSearch = {
  stage?: string; location?: string; irFunction?: string; search?: string;
  screenOutReason?: string; fit?: string; seniority?: Seniority;
};

export const Route = createFileRoute("/_authenticated/candidates")({
  validateSearch: (raw: Record<string, unknown>): CandidatesSearch => ({
    stage: typeof raw.stage === "string" ? raw.stage : undefined,
    location: typeof raw.location === "string" ? raw.location : undefined,
    irFunction: typeof raw.irFunction === "string" ? raw.irFunction : undefined,
    search: typeof raw.search === "string" ? raw.search : undefined,
    screenOutReason: typeof raw.screenOutReason === "string" ? raw.screenOutReason : undefined,
    fit: typeof raw.fit === "string" && (CANDIDATE_FITS as readonly string[]).includes(raw.fit) ? raw.fit : undefined,
    seniority: typeof raw.seniority === "string" && (SENIORITIES as readonly string[]).includes(raw.seniority) ? raw.seniority as Seniority : undefined,
  }),
  component: CandidatesPage,
});

type Tab = "master" | "shortlist";

function CandidatesPage() {
  const { role } = useAuth();
  const isRecruiter = role === "recruiter";
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>("master");
  const [filters, setFilters] = useState<Filters>(() => ({
    ...defaultFilters,
    search: search.search ?? "",
    stage: search.stage ?? "",
    location: search.location ?? "",
    irFunction: search.irFunction ?? "",
    screenOutReason: search.screenOutReason ?? "",
    fit: search.fit ?? "",
  }));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  useEffect(() => {
    setFilters((f) => ({
      ...f,
      search: search.search ?? "",
      stage: search.stage ?? "",
      location: search.location ?? "",
      irFunction: search.irFunction ?? "",
      screenOutReason: search.screenOutReason ?? "",
      fit: search.fit ?? "",
    }));
  }, [search.search, search.stage, search.location, search.irFunction, search.screenOutReason, search.fit]);

  const handleFiltersChange = (next: Filters) => {
    setFilters(next);
    navigate({
      search: (prev: CandidatesSearch) => ({
        ...prev,
        search: next.search || undefined,
        stage: next.stage || undefined,
        location: next.location || undefined,
        irFunction: next.irFunction || undefined,
        screenOutReason: next.screenOutReason || undefined,
        fit: next.fit || undefined,
      }),
      replace: true,
    });
  };

  const list = useServerFn(listCandidates);
  const setFitFn = useServerFn(setFit);

  const { data, isLoading } = useQuery({
    queryKey: ["candidates", filters],
    queryFn: () => list({
      data: {
        search: filters.search || undefined,
        stage: (filters.stage || undefined) as never,
        location: (filters.location || undefined) as never,
        irFunction: (filters.irFunction || undefined) as never,
        screenOutReason: filters.screenOutReason || undefined,
        fit: (filters.fit || undefined) as never,
        clientVisible: filters.clientVisible,
        shortlisted: "all",
      },
    }),
  });

  const allRows = (data ?? []) as Array<{ id: string; fit: CandidateFit; shortlisted: boolean; current_title: string | null } & Record<string, unknown>>;
  const shortlistedCount = useMemo(() => allRows.filter((c) => c.fit === "Target Fit").length, [allRows]);
  const senFiltered = useMemo(
    () => (search.seniority ? allRows.filter((c) => classify(c.current_title) === search.seniority) : allRows),
    [allRows, search.seniority],
  );
  const visibleRows = useMemo(
    () => (isRecruiter && tab === "shortlist" ? senFiltered.filter((c) => c.fit === "Target Fit") : senFiltered),
    [senFiltered, tab, isRecruiter],
  );

  const bulkMut = useMutation({
    mutationFn: (fit: CandidateFit) =>
      setFitFn({ data: { ids: Array.from(selected), fit } }),
    onSuccess: (_res, fit) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success(`${selected.size} updated to "${fit}"`);
      setSelected(new Set());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === visibleRows.length) setSelected(new Set());
    else setSelected(new Set(visibleRows.map((r) => r.id)));
  };

  const clearSeniority = () =>
    navigate({ search: (prev: CandidatesSearch) => ({ ...prev, seniority: undefined }), replace: true });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${visibleRows.length} ${visibleRows.length === 1 ? "candidate" : "candidates"}`}
          </p>
        </div>
        {isRecruiter && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/import"><Upload className="h-4 w-4 mr-1" /> Import CSV</Link>
            </Button>
            <AddCandidateDialog />
          </div>
        )}
      </div>

      {search.seniority && (
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
          <span className="text-muted-foreground">Filtered:</span>
          <span className="font-medium text-foreground">{SENIORITY_LABEL[search.seniority as Seniority]}</span>
          <button onClick={clearSeniority} className="ml-1 inline-flex items-center hover:text-destructive" aria-label="Clear seniority filter">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {isRecruiter && (
        <div className="flex items-center gap-6 border-b border-[#EAECF0]">
          {([
            { id: "master", label: "Master list", count: senFiltered.length },
            { id: "shortlist", label: "Shortlist", count: shortlistedCount },
          ] as const).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id as Tab); setSelected(new Set()); }}
                className={`-mb-px pb-3 pt-1 text-sm font-semibold border-b-2 transition-colors ${
                  active
                    ? "text-[#1570EF] border-[#1570EF]"
                    : "text-[#667085] border-transparent hover:text-[#101828]"
                }`}
              >
                {t.label} ({t.count})
              </button>
            );
          })}
        </div>
      )}

      <CandidateFilters value={filters} onChange={handleFiltersChange} role={isRecruiter ? "recruiter" : "client"} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <CandidatesTable
          rows={visibleRows as never}
          role={isRecruiter ? "recruiter" : "client"}
          selected={selected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />
      )}

      {isRecruiter && selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-[var(--shadow-card)]">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <span className="h-4 w-px bg-border mx-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={bulkMut.isPending}>
                Set fit <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CANDIDATE_FITS.map((f) => (
                <DropdownMenuItem key={f} onClick={() => bulkMut.mutate(f)}>{f}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
