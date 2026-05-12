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

type CandidatesSearch = {
  stage?: string; location?: string; irFunction?: string; search?: string;
  owner?: string; sourcedBy?: string; screenOutReason?: string; fit?: string;
};

export const Route = createFileRoute("/_authenticated/candidates")({
  validateSearch: (raw: Record<string, unknown>): CandidatesSearch => ({
    stage: typeof raw.stage === "string" ? raw.stage : undefined,
    location: typeof raw.location === "string" ? raw.location : undefined,
    irFunction: typeof raw.irFunction === "string" ? raw.irFunction : undefined,
    search: typeof raw.search === "string" ? raw.search : undefined,
    owner: typeof raw.owner === "string" ? raw.owner : undefined,
    sourcedBy: typeof raw.sourcedBy === "string" ? raw.sourcedBy : undefined,
    screenOutReason: typeof raw.screenOutReason === "string" ? raw.screenOutReason : undefined,
    fit: typeof raw.fit === "string" && (CANDIDATE_FITS as readonly string[]).includes(raw.fit) ? raw.fit : undefined,
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
    owner: search.owner ?? "",
    sourcedBy: search.sourcedBy ?? "",
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
      owner: search.owner ?? "",
      sourcedBy: search.sourcedBy ?? "",
      screenOutReason: search.screenOutReason ?? "",
      fit: search.fit ?? "",
    }));
  }, [search.search, search.stage, search.location, search.irFunction, search.owner, search.sourcedBy, search.screenOutReason, search.fit]);

  const handleFiltersChange = (next: Filters) => {
    setFilters(next);
    navigate({
      search: {
        search: next.search || undefined,
        stage: next.stage || undefined,
        location: next.location || undefined,
        irFunction: next.irFunction || undefined,
        owner: next.owner || undefined,
        sourcedBy: next.sourcedBy || undefined,
        screenOutReason: next.screenOutReason || undefined,
        fit: next.fit || undefined,
      },
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
        owner: (filters.owner || undefined) as never,
        sourcedBy: (filters.sourcedBy || undefined) as never,
        screenOutReason: filters.screenOutReason || undefined,
        fit: (filters.fit || undefined) as never,
        clientVisible: filters.clientVisible,
        shortlisted: "all",
      },
    }),
  });

  const allRows = (data ?? []) as Array<{ id: string; fit: CandidateFit; shortlisted: boolean } & Record<string, unknown>>;
  const shortlistedCount = useMemo(() => allRows.filter((c) => c.fit === "Target Fit").length, [allRows]);
  const visibleRows = useMemo(
    () => (isRecruiter && tab === "shortlist" ? allRows.filter((c) => c.fit === "Target Fit") : allRows),
    [allRows, tab, isRecruiter],
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

      {isRecruiter && (
        <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSelected(new Set()); }}>
          <TabsList>
            <TabsTrigger value="master">Master list ({allRows.length})</TabsTrigger>
            <TabsTrigger value="shortlist">
              <Star className="h-3.5 w-3.5 mr-1.5" />
              Shortlist ({shortlistedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
